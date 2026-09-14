import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import type { ChatMessage, ChatMode, ChatStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { recordActivity, upsertContact } from '@/lib/crm/contacts';
import { normaliseEmail } from '@/lib/marketing/consent';
import {
  MAX_MESSAGE_LENGTH,
  type ChatMessageDto,
  type ChatModeName,
  type ChatStatusName,
} from '@/lib/chat/shared';

/*
  Live chat: the write and read paths for both sides of a conversation.

  THE VISITOR IS A TOKEN. A random 256-bit value lives in an httpOnly cookie scoped to /api/chat;
  only its SHA-256 is stored. A random token needs no salt — there is nothing to brute-force —
  and storing the hash means a read of the table cannot be replayed as somebody's browser.
  Nothing about the visitor is inferred: a name and an address exist only if they typed them.

  EVERY QUERY IS A SINGLE ROUND TRIP where it can be. The widget polls every two seconds while it
  is open, and this database is Neon behind PgBouncer; a poll is one indexed lookup that returns
  only the messages newer than the last one the widget holds. A browser that has never chatted
  has no cookie and costs the database nothing at all.

  NO INTERACTIVE TRANSACTIONS, for the reason lib/crm/contacts.ts gives: holding a connection
  across remote round trips blew Prisma's ceiling and deadlocked admin writes. Writes here are
  nested writes, which are atomic on their own.

  A CHAT IS NEVER CONSENT. Leaving an address links a Contact so a person can answer; the
  subscriber table is unreachable from this file.
*/

/* ------------------------------------------------------------------ tokens */

export function newChatToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Exactly the shape newChatToken produces, so junk never reaches a query. */
export function isChatToken(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/* ------------------------------------------------------------------ mapping */

const ROLE = { VISITOR: 'visitor', BOT: 'bot', STAFF: 'staff' } as const;
const MODE_NAME: Record<ChatMode, ChatModeName> = { AGENT: 'agent', SUPPORT: 'support' };
const MODE_ENUM: Record<ChatModeName, ChatMode> = { agent: 'AGENT', support: 'SUPPORT' };
const STATUS_NAME: Record<ChatStatus, ChatStatusName> = {
  AGENT: 'agent',
  OPEN: 'open',
  ANSWERED: 'answered',
  CLOSED: 'closed',
};

export function toDto(m: Pick<ChatMessage, 'id' | 'role' | 'mode' | 'body' | 'createdAt'>): ChatMessageDto {
  return {
    id: m.id,
    role: ROLE[m.role],
    mode: MODE_NAME[m.mode],
    body: m.body,
    createdAt: m.createdAt.toISOString(),
  };
}

/** Trimmed, with runs of blank lines collapsed. Null when there is nothing left to send. */
export function cleanBody(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const body = raw.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!body || body.length > MAX_MESSAGE_LENGTH) return null;
  return body;
}

function parseAfter(after: string | null | undefined): Date | null {
  if (!after) return null;
  const date = new Date(after);
  return Number.isNaN(date.getTime()) ? null : date;
}

/* ------------------------------------------------------------------ visitor side */

/**
 * The messages a visitor has not seen yet.
 *
 * `after` is the timestamp of the newest message the widget already holds. The comparison is
 * `gte`, not `gt`, so two messages written in the same millisecond cannot fall between polls;
 * the widget drops the one it already has by id.
 */
export async function visitorMessagesAfter(
  token: string,
  after?: string | null
): Promise<{ status: ChatStatusName | null; messages: ChatMessageDto[] }> {
  const since = parseAfter(after);
  const conversation = await prisma.chatConversation.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      status: true,
      messages: {
        where: since ? { createdAt: { gte: since } } : undefined,
        orderBy: { createdAt: 'asc' },
        take: 200,
        select: { id: true, role: true, mode: true, body: true, createdAt: true },
      },
    },
  });

  if (!conversation) return { status: null, messages: [] };
  return { status: STATUS_NAME[conversation.status], messages: conversation.messages.map(toDto) };
}

/**
 * Store a visitor's message, starting the conversation if this is the first.
 *
 * Status follows who has to act next. Writing to Support always puts the thread in front of a
 * person. Writing to the agent leaves a thread a person is already handling where it is; it
 * only starts, or restarts, an agent-only thread.
 */
export async function postVisitorMessage(input: {
  token: string;
  body: string;
  mode: ChatModeName;
  path: string | null;
  ipHash: string | null;
}): Promise<{ conversationId: string; message: ChatMessageDto }> {
  const tokenHash = hashToken(input.token);
  const mode = MODE_ENUM[input.mode];
  const now = new Date();

  const existing = await prisma.chatConversation.findUnique({
    where: { tokenHash },
    select: { status: true },
  });

  let status: ChatStatus;
  if (mode === 'SUPPORT') status = 'OPEN';
  else if (!existing || existing.status === 'CLOSED') status = 'AGENT';
  else status = existing.status;

  const message = { role: 'VISITOR' as const, mode, body: input.body, createdAt: now };

  const row = await prisma.chatConversation.upsert({
    where: { tokenHash },
    create: {
      tokenHash,
      status,
      mode,
      path: input.path,
      ipHash: input.ipHash,
      lastMessageAt: now,
      lastVisitorAt: now,
      messages: { create: message },
    },
    update: {
      status,
      mode,
      lastMessageAt: now,
      lastVisitorAt: now,
      messages: { create: message },
    },
    select: {
      id: true,
      messages: {
        where: { role: 'VISITOR' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, role: true, mode: true, body: true, createdAt: true },
      },
    },
  });

  return { conversationId: row.id, message: toDto(row.messages[0]) };
}

/** The agent's answer, appended to the thread. */
export async function postBotReply(conversationId: string, body: string): Promise<ChatMessageDto> {
  const now = new Date();
  /* One nested write: the reply and the thread's timestamp land together. */
  const row = await prisma.chatConversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: now,
      messages: { create: { role: 'BOT', mode: 'AGENT', body, createdAt: now } },
    },
    select: {
      messages: {
        where: { role: 'BOT' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, role: true, mode: true, body: true, createdAt: true },
      },
    },
  });
  return toDto(row.messages[0]);
}

/** The last few turns, oldest first, for the agent to read the question in context. */
export async function recentHistory(conversationId: string, limit = 12): Promise<ChatMessageDto[]> {
  const rows = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true, role: true, mode: true, body: true, createdAt: true },
  });
  return rows.reverse().map(toDto);
}

/**
 * The visitor offered a name and an address so a person can answer after they have gone.
 *
 * Links (or starts) a Contact and records it on their timeline, the first time only. Never a
 * Subscriber. Answers the same way whether or not the address was already known, so the box
 * cannot be used to test who shops here.
 */
export async function attachVisitorDetails(input: {
  token: string;
  email: string;
  name: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = normaliseEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { ok: false, error: 'That address is missing an @ or a domain.' };
  }
  const name = input.name?.trim().slice(0, 120) || null;

  const conversation = await prisma.chatConversation.findUnique({
    where: { tokenHash: hashToken(input.token) },
    select: { id: true, contactId: true },
  });
  /* Nothing to attach it to yet. The widget only offers the box after a message is sent. */
  if (!conversation) return { ok: false, error: 'Send a message first, then leave your address.' };

  const contact = await upsertContact(prisma, { email, name, firstSource: 'live chat' });

  await prisma.chatConversation.update({
    where: { id: conversation.id },
    data: { email, name, contactId: contact.id },
  });

  if (conversation.contactId !== contact.id) {
    await recordActivity(prisma, {
      contactId: contact.id,
      type: 'CHAT_STARTED',
      summary: 'Left their address in a live chat so a person could reply.',
    });
  }

  return { ok: true };
}

/* ------------------------------------------------------------------ staff side */

export type ChatFilter = 'waiting' | 'answered' | 'agent' | 'closed' | 'all';

export const CHAT_FILTERS: { key: ChatFilter; label: string }[] = [
  { key: 'waiting', label: 'Waiting on us' },
  { key: 'answered', label: 'Answered' },
  { key: 'agent', label: 'Agent only' },
  { key: 'closed', label: 'Closed' },
  { key: 'all', label: 'All' },
];

function filterWhere(filter: ChatFilter): Prisma.ChatConversationWhereInput {
  switch (filter) {
    case 'waiting':
      return { status: 'OPEN' };
    case 'answered':
      return { status: 'ANSWERED' };
    case 'agent':
      return { status: 'AGENT' };
    case 'closed':
      return { status: 'CLOSED' };
    default:
      return {};
  }
}

export function isChatFilter(value: unknown): value is ChatFilter {
  return CHAT_FILTERS.some((f) => f.key === value);
}

export type ChatListRow = {
  id: string;
  status: ChatStatusName;
  mode: ChatModeName;
  name: string | null;
  email: string | null;
  contactId: string | null;
  path: string | null;
  lastMessageAt: string;
  preview: { role: ChatMessageDto['role']; body: string } | null;
  unread: boolean;
  messageCount: number;
};

export async function listConversations(filter: ChatFilter, q?: string): Promise<{
  rows: ChatListRow[];
  counts: Record<ChatFilter, number>;
}> {
  const where: Prisma.ChatConversationWhereInput = { ...filterWhere(filter) };
  const term = q?.trim();
  if (term) {
    where.OR = [
      { email: { contains: term, mode: 'insensitive' } },
      { name: { contains: term, mode: 'insensitive' } },
      { messages: { some: { body: { contains: term, mode: 'insensitive' } } } },
    ];
  }

  const [rows, counts] = await Promise.all([
    prisma.chatConversation.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
      select: {
        id: true,
        status: true,
        mode: true,
        name: true,
        email: true,
        contactId: true,
        path: true,
        lastMessageAt: true,
        lastVisitorAt: true,
        staffReadAt: true,
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { role: true, body: true },
        },
      },
    }),
    prisma.chatConversation.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);

  const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Partial<
    Record<ChatStatus, number>
  >;
  const total = counts.reduce((sum, c) => sum + c._count._all, 0);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      status: STATUS_NAME[r.status],
      mode: MODE_NAME[r.mode],
      name: r.name,
      email: r.email,
      contactId: r.contactId,
      path: r.path,
      lastMessageAt: r.lastMessageAt.toISOString(),
      preview: r.messages[0]
        ? { role: ROLE[r.messages[0].role], body: r.messages[0].body.slice(0, 140) }
        : null,
      unread: Boolean(r.lastVisitorAt && (!r.staffReadAt || r.lastVisitorAt > r.staffReadAt)),
      messageCount: r._count.messages,
    })),
    counts: {
      waiting: byStatus.OPEN ?? 0,
      answered: byStatus.ANSWERED ?? 0,
      agent: byStatus.AGENT ?? 0,
      closed: byStatus.CLOSED ?? 0,
      all: total,
    },
  };
}

/** Conversations waiting on a person. The admin menu bubble. */
export function waitingChatCount(): Promise<number> {
  return prisma.chatConversation.count({ where: { status: 'OPEN' } });
}

export type StaffMessageDto = ChatMessageDto & { staffEmail: string | null };

export type ChatThread = {
  id: string;
  status: ChatStatusName;
  mode: ChatModeName;
  name: string | null;
  email: string | null;
  contactId: string | null;
  path: string | null;
  createdAt: string;
  messages: StaffMessageDto[];
};

/**
 * A conversation as staff see it, marking it read.
 *
 * Reading marks it read because the person looking at the thread is, by definition, the person
 * who has now seen it. `after` works as it does for the visitor: only what is new.
 */
export async function staffThread(id: string, after?: string | null): Promise<ChatThread | null> {
  const since = parseAfter(after);
  const row = await prisma.chatConversation.update({
    where: { id },
    data: { staffReadAt: new Date() },
    select: {
      id: true,
      status: true,
      mode: true,
      name: true,
      email: true,
      contactId: true,
      path: true,
      createdAt: true,
      messages: {
        where: since ? { createdAt: { gte: since } } : undefined,
        orderBy: { createdAt: 'asc' },
        take: 500,
        select: { id: true, role: true, mode: true, body: true, createdAt: true, staffEmail: true },
      },
    },
  }).catch(() => null);

  if (!row) return null;
  return {
    id: row.id,
    status: STATUS_NAME[row.status],
    mode: MODE_NAME[row.mode],
    name: row.name,
    email: row.email,
    contactId: row.contactId,
    path: row.path,
    createdAt: row.createdAt.toISOString(),
    messages: row.messages.map((m) => ({ ...toDto(m), staffEmail: m.staffEmail })),
  };
}

/** A person's reply. It reaches the visitor on their next poll. */
export async function postStaffReply(input: {
  conversationId: string;
  body: string;
  staffEmail: string;
}): Promise<{ ok: true; message: StaffMessageDto } | { ok: false; error: string }> {
  const now = new Date();
  const updated = await prisma.chatConversation
    .update({
      where: { id: input.conversationId },
      data: {
        status: 'ANSWERED',
        lastMessageAt: now,
        staffReadAt: now,
        messages: {
          create: {
            role: 'STAFF',
            mode: 'SUPPORT',
            body: input.body,
            staffEmail: input.staffEmail,
            createdAt: now,
          },
        },
      },
      /* The reply comes back with the write, so the inbox can show it without asking again. */
      select: {
        messages: {
          where: { role: 'STAFF' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, role: true, mode: true, body: true, createdAt: true, staffEmail: true },
        },
      },
    })
    .catch(() => null);

  const message = updated?.messages[0];
  return message
    ? { ok: true, message: { ...toDto(message), staffEmail: message.staffEmail } }
    : { ok: false, error: 'That conversation no longer exists.' };
}

export async function setConversationStatus(
  id: string,
  status: 'OPEN' | 'CLOSED'
): Promise<{ ok: true } | { ok: false; error: string }> {
  const updated = await prisma.chatConversation
    .update({ where: { id }, data: { status }, select: { id: true } })
    .catch(() => null);
  return updated ? { ok: true } : { ok: false, error: 'That conversation no longer exists.' };
}
