import { NextResponse } from 'next/server';
import { clientIp, hashIp } from '@/lib/ip-hash';
import {
  cleanBody,
  newChatToken,
  postBotReply,
  postVisitorMessage,
  recentHistory,
} from '@/lib/chat';
import { answerAsAgent } from '@/lib/chat/agent';
import { chatEnabled, chatTokenFrom, cleanPath, overLimit, setChatCookie } from '@/lib/chat/http';
import { MAX_MESSAGE_LENGTH, isChatMode, type ChatMessageDto } from '@/lib/chat/shared';

/*
  A visitor sends a message.

  Support mode stores it and puts the conversation in front of a person (status OPEN). Agent mode
  stores it and answers in the same request, so the reply comes back with the message rather than
  waiting for the next poll.

  Rate limited twice: every message, and more tightly Agent messages, which can call a paid API.
  A honeypot field answers exactly like a success, for the reason /api/enquiry gives: telling a
  bot it was caught is telling it how to pass.

  Node runtime: the chat token and the IP evidence are hashed with node:crypto.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_MESSAGES = 30;
const MAX_AGENT_REPLIES = 20;

export async function POST(request: Request) {
  if (!(await chatEnabled())) {
    return NextResponse.json({ error: 'Chat is not available right now.' }, { status: 404 });
  }

  const ip = clientIp(request) ?? 'local';
  if (overLimit('chat-message', ip, MAX_MESSAGES, WINDOW_MS)) {
    return NextResponse.json(
      { error: 'That is a lot of messages in a short time. Wait a few minutes and try again.' },
      { status: 429 }
    );
  }

  const input = (await request.json().catch(() => null)) as {
    body?: unknown;
    mode?: unknown;
    path?: unknown;
    /* Hidden from people. Only a bot fills it. */
    website?: unknown;
  } | null;

  if (!input) return NextResponse.json({ error: 'That message could not be read.' }, { status: 400 });

  if (typeof input.website === 'string' && input.website.trim()) {
    return NextResponse.json({ messages: [], status: 'agent' }, { status: 201 });
  }

  const body = cleanBody(input.body);
  if (!body) {
    return NextResponse.json(
      { error: `Write a message of up to ${MAX_MESSAGE_LENGTH.toLocaleString('en-US')} characters.` },
      { status: 400 }
    );
  }
  if (!isChatMode(input.mode)) {
    return NextResponse.json({ error: 'Choose Agent or Support.' }, { status: 400 });
  }

  const existingToken = chatTokenFrom(request);
  const token = existingToken ?? newChatToken();

  const { conversationId, message } = await postVisitorMessage({
    token,
    body,
    mode: input.mode,
    path: cleanPath(input.path),
    ipHash: hashIp(clientIp(request)),
  });

  const messages: ChatMessageDto[] = [message];
  let status: 'agent' | 'open' = input.mode === 'support' ? 'open' : 'agent';

  if (input.mode === 'agent') {
    const reply = overLimit('chat-agent', ip, MAX_AGENT_REPLIES, WINDOW_MS)
      ? 'I have answered a lot of questions from this connection in a short time. Switch to **Support** below and a person will reply here.'
      : await answerAsAgent(body, await recentHistory(conversationId));
    messages.push(await postBotReply(conversationId, reply));
    status = 'agent';
  }

  const response = NextResponse.json({ messages, status }, { status: 201 });
  if (!existingToken) setChatCookie(response, token);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
