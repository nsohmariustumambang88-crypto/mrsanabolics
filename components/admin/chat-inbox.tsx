'use client';

import * as React from 'react';
import Link from 'next/link';
import { runAction } from '@/components/admin/run-action';
import { replyToChatAction, setChatStatusAction } from '@/app/admin/chat-actions';
import type { ChatFilter, ChatListRow, ChatThread, StaffMessageDto } from '@/lib/chat';
import {
  MAX_MESSAGE_LENGTH,
  STAFF_LIST_POLL_MS,
  STAFF_THREAD_POLL_MS,
  type ChatStatusName,
} from '@/lib/chat/shared';
import { cn } from '@/lib/utils';

/*
  The Live Chat inbox: a list of conversations beside the one that is open.

  KEPT LIVE BY POLLING, not a socket, because this deploys to serverless functions that cannot hold
  one open. The open thread asks for anything newer than its last message every few seconds; the
  list refreshes less often. Both pause while the tab is hidden, so an admin left open in a
  background tab is not a steady load on the database.

  Selecting a conversation does not navigate. It fetches the thread and rewrites the address with
  history.replaceState, so the URL can be shared and reloaded without every click re-rendering
  the whole server page.

  Colours are wp-admin's own literals, like the rest of the admin: blue for the agent, the WordPress
  success green for staff, and the #f0f0f1 field grey for the visitor.
*/

type ListState = { rows: ChatListRow[]; counts: Record<ChatFilter, number> };

const STATUS_LABEL: Record<ChatStatusName, string> = {
  agent: 'Agent only',
  open: 'Waiting on us',
  answered: 'Answered',
  closed: 'Closed',
};

const STATUS_STYLE: Record<ChatStatusName, string> = {
  agent: 'border-[#72aee6] bg-[#f0f6fc] text-[#135e96]',
  open: 'border-[#dba617] bg-[#fcf9e8] text-[#8a6d00]',
  answered: 'border-[#68de7c] bg-[#edfaef] text-[#007017]',
  closed: 'border-[#c3c4c7] bg-[#f6f7f7] text-[#50575e]',
};

function when(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return new Intl.DateTimeFormat('en-GB', {
    ...(sameDay ? {} : { day: 'numeric', month: 'short' }),
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function merge(existing: StaffMessageDto[], incoming: StaffMessageDto[]): StaffMessageDto[] {
  if (incoming.length === 0) return existing;
  const seen = new Set(existing.map((m) => m.id));
  const added = incoming.filter((m) => !seen.has(m.id));
  return added.length ? [...existing, ...added] : existing;
}

function useVisiblePoll(callback: () => void, ms: number, enabled: boolean) {
  const saved = React.useRef(callback);
  saved.current = callback;
  React.useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      if (document.visibilityState === 'visible') saved.current();
    };
    const id = window.setInterval(tick, ms);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [ms, enabled]);
}

export function ChatInbox({
  filters,
  initialFilter,
  initialQuery,
  initialList,
  initialThread,
}: {
  filters: { key: ChatFilter; label: string }[];
  initialFilter: ChatFilter;
  initialQuery: string;
  initialList: ListState;
  initialThread: ChatThread | null;
}) {
  const [filter, setFilter] = React.useState<ChatFilter>(initialFilter);
  const [query, setQuery] = React.useState(initialQuery);
  const [list, setList] = React.useState<ListState>(initialList);
  const [thread, setThread] = React.useState<ChatThread | null>(initialThread);
  const [draft, setDraft] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scroller = React.useRef<HTMLDivElement>(null);
  const stickToBottom = React.useRef(true);

  const writeUrl = React.useCallback((next: { filter: ChatFilter; q: string; c: string | null }) => {
    const params = new URLSearchParams();
    if (next.filter !== 'waiting') params.set('filter', next.filter);
    if (next.q) params.set('q', next.q);
    if (next.c) params.set('c', next.c);
    const qs = params.toString();
    /* Keep the router's own history state: replacing it with null breaks back and forward. */
    window.history.replaceState(window.history.state, '', qs ? `/admin/chat?${qs}` : '/admin/chat');
  }, []);

  const loadList = React.useCallback(async (f: ChatFilter, q: string) => {
    try {
      const params = new URLSearchParams({ filter: f });
      if (q) params.set('q', q);
      const res = await fetch(`/api/admin/chat?${params}`, { cache: 'no-store' });
      if (res.ok) setList(await res.json());
    } catch {
      /* A missed refresh is retried on the next tick. */
    }
  }, []);

  const refreshThread = React.useCallback(async () => {
    if (!thread) return;
    const last = thread.messages[thread.messages.length - 1];
    const params = last ? `?after=${encodeURIComponent(last.createdAt)}` : '';
    try {
      const res = await fetch(`/api/admin/chat/${thread.id}${params}`, { cache: 'no-store' });
      if (!res.ok) return;
      const fresh: ChatThread = await res.json();
      setThread((current) =>
        current && current.id === fresh.id
          ? { ...fresh, messages: merge(current.messages, fresh.messages) }
          : current
      );
    } catch {
      /* Retried on the next tick. */
    }
  }, [thread]);

  useVisiblePoll(refreshThread, STAFF_THREAD_POLL_MS, Boolean(thread));
  useVisiblePoll(() => loadList(filter, query), STAFF_LIST_POLL_MS, true);

  /* Follow new messages down, unless the reader has scrolled up to read something older. */
  React.useEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [thread?.messages.length, thread?.id]);

  const open = async (id: string) => {
    setError(null);
    stickToBottom.current = true;
    writeUrl({ filter, q: query, c: id });
    try {
      const res = await fetch(`/api/admin/chat/${id}`, { cache: 'no-store' });
      if (!res.ok) {
        setError('That conversation could not be loaded.');
        return;
      }
      setThread(await res.json());
      setDraft('');
      setList((current) => ({
        ...current,
        rows: current.rows.map((r) => (r.id === id ? { ...r, unread: false } : r)),
      }));
    } catch {
      setError('That conversation could not be loaded. Check the connection and try again.');
    }
  };

  const changeFilter = (next: ChatFilter) => {
    setFilter(next);
    writeUrl({ filter: next, q: query, c: thread?.id ?? null });
    void loadList(next, query);
  };

  const search = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = String(new FormData(event.currentTarget).get('q') ?? '').trim();
    setQuery(q);
    writeUrl({ filter, q, c: thread?.id ?? null });
    void loadList(filter, q);
  };

  const send = async () => {
    if (!thread || busy) return;
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    setError(null);
    const result = await runAction(() => replyToChatAction(thread.id, body));
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDraft('');
    stickToBottom.current = true;
    /* The saved reply came back with the action: show it now, and let the poll catch up the rest. */
    setThread((current) =>
      current && current.id === thread.id
        ? { ...current, status: 'answered', messages: merge(current.messages, [result.message]) }
        : current
    );
    void loadList(filter, query);
  };

  const changeStatus = async (status: 'OPEN' | 'CLOSED') => {
    if (!thread || busy) return;
    setBusy(true);
    setError(null);
    const result = await runAction(() => setChatStatusAction(thread.id, status));
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await refreshThread();
    void loadList(filter, query);
  };

  return (
    <>
      <ul className="wp-subsubsub">
        {filters.map((f) => (
          <li key={f.key}>
            <button
              type="button"
              onClick={() => changeFilter(f.key)}
              className={cn('cursor-pointer border-0 bg-transparent p-0 text-[13px] text-[#2271b1]', filter === f.key && 'current font-semibold text-black')}
              aria-pressed={filter === f.key}
            >
              {f.label} <span className="wp-count">({list.counts[f.key]})</span>
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={search} className="mb-3 flex flex-wrap items-center gap-2 min-[783px]:justify-end">
        <label className="wp-screen-reader-text" htmlFor="chat-search">
          Search conversations
        </label>
        <input
          id="chat-search"
          name="q"
          defaultValue={initialQuery}
          placeholder="Name, address or words"
          className="wp-input wp-input-search"
        />
        <button type="submit" className="wp-button">
          Search
        </button>
      </form>

      {error && (
        <div className="wp-notice wp-notice-error" role="alert">
          <p>{error}</p>
        </div>
      )}

      <div className="grid gap-4 min-[783px]:grid-cols-[21rem_minmax(0,1fr)]">
        {/* The list. On a phone it gives way to the thread once one is open. */}
        <section
          aria-label="Conversations"
          className={cn('border border-[#c3c4c7] bg-white', thread && 'wp-hide-mobile')}
        >
          {list.rows.length === 0 ? (
            <p className="m-0 p-4 text-[13px] text-[#646970]">
              {filter === 'waiting'
                ? 'Nobody is waiting on a reply.'
                : 'Conversations started from the chat button on the storefront appear here.'}
            </p>
          ) : (
            <ul className="m-0 max-h-[70vh] list-none divide-y divide-[#dcdcde] overflow-y-auto p-0">
              {list.rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => open(row.id)}
                    aria-current={thread?.id === row.id ? 'true' : undefined}
                    className={cn(
                      'block w-full cursor-pointer border-0 bg-white px-3 py-2.5 text-left hover:bg-[#f6f7f7]',
                      thread?.id === row.id && 'bg-[#f0f6fc] shadow-[inset_3px_0_0_#2271b1] hover:bg-[#f0f6fc]'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {row.unread && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[#2271b1]" aria-label="Unread" />
                      )}
                      <span className={cn('min-w-0 flex-1 truncate text-[13px] text-[#1d2327]', row.unread && 'font-semibold')}>
                        {row.name || row.email || 'Visitor'}
                      </span>
                      <time className="shrink-0 text-[12px] text-[#646970]" suppressHydrationWarning>
                        {when(row.lastMessageAt)}
                      </time>
                    </span>
                    {row.preview && (
                      <span className="mt-1 line-clamp-2 block text-[12px] leading-snug text-[#50575e]">
                        {row.preview.role === 'staff' ? 'You: ' : row.preview.role === 'bot' ? 'Agent: ' : ''}
                        {row.preview.body}
                      </span>
                    )}
                    <span className="mt-1.5 flex items-center gap-2">
                      <span className={cn('rounded-sm border px-1.5 py-px text-[11px]', STATUS_STYLE[row.status])}>
                        {STATUS_LABEL[row.status]}
                      </span>
                      <span className="text-[11px] text-[#646970]">{row.messageCount} messages</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* The open conversation. */}
        <section aria-label="Conversation" className={cn('border border-[#c3c4c7] bg-white', !thread && 'wp-hide-mobile')}>
          {!thread ? (
            <p className="m-0 p-6 text-[13px] text-[#646970]">Choose a conversation to read it and reply.</p>
          ) : (
            <div className="flex h-full flex-col">
              <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#dcdcde] px-4 py-3">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      setThread(null);
                      writeUrl({ filter, q: query, c: null });
                    }}
                    className="wp-hide-desktop mb-2 cursor-pointer border-0 bg-transparent p-0 text-[13px] text-[#2271b1]"
                  >
                    ← All conversations
                  </button>
                  <h2 className="m-0 text-[14px] font-semibold text-[#1d2327]">
                    {thread.name || thread.email || 'Visitor'}
                  </h2>
                  <p className="m-0 mt-1 text-[12px] text-[#646970]">
                    {thread.email ? (
                      thread.contactId ? (
                        <Link href={`/admin/contacts/${thread.contactId}`}>{thread.email}</Link>
                      ) : (
                        thread.email
                      )
                    ) : (
                      'No address left'
                    )}
                    {thread.path && <> · started on <code className="text-[11px]">{thread.path}</code></>}
                    {' · '}
                    <time suppressHydrationWarning>{when(thread.createdAt)}</time>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('rounded-sm border px-1.5 py-px text-[12px]', STATUS_STYLE[thread.status])}>
                    {STATUS_LABEL[thread.status]}
                  </span>
                  {thread.status === 'closed' ? (
                    <button type="button" className="wp-button" disabled={busy} onClick={() => changeStatus('OPEN')}>
                      Reopen
                    </button>
                  ) : (
                    <button type="button" className="wp-button" disabled={busy} onClick={() => changeStatus('CLOSED')}>
                      Close
                    </button>
                  )}
                </div>
              </header>

              <div
                ref={scroller}
                onScroll={(event) => {
                  const el = event.currentTarget;
                  stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
                }}
                className="max-h-[55vh] min-h-[16rem] flex-1 space-y-3 overflow-y-auto bg-[#f6f7f7] px-4 py-4"
                aria-live="polite"
              >
                {thread.messages.map((m) => (
                  <StaffBubble key={m.id} message={m} />
                ))}
              </div>

              <form
                className="border-t border-[#dcdcde] p-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void send();
                }}
              >
                <label className="wp-screen-reader-text" htmlFor="chat-reply">
                  Reply
                </label>
                <textarea
                  id="chat-reply"
                  className="wp-textarea"
                  rows={3}
                  maxLength={MAX_MESSAGE_LENGTH}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder="Write a reply. It appears in the visitor's chat within a couple of seconds."
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="m-0 text-[12px] text-[#646970]">
                    {thread.status === 'closed'
                      ? 'Replying reopens the conversation as answered.'
                      : 'Ctrl+Enter sends. The visitor sees “Support”, not your name.'}
                  </p>
                  <button type="submit" className="wp-button wp-button-primary" disabled={busy || !draft.trim()}>
                    {busy ? 'Sending…' : 'Send reply'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

/* The agent writes [label](/path) links for the storefront; here they open the page it linked. */
function AgentText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of Array.from(text.matchAll(/\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g))) {
    const at = m.index ?? 0;
    if (at > last) parts.push(text.slice(last, at));
    if (m[1] !== undefined) parts.push(<strong key={key++}>{m[1]}</strong>);
    else if (m[3]?.startsWith('/') && !m[3].startsWith('//')) {
      parts.push(
        <a key={key++} href={m[3]} target="_blank" rel="noreferrer">
          {m[2]}
        </a>
      );
    } else parts.push(m[2]);
    last = at + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function StaffBubble({ message }: { message: StaffMessageDto }) {
  const mine = message.role === 'staff';
  const label = message.role === 'visitor' ? 'Visitor' : message.role === 'bot' ? 'Agent' : message.staffEmail ?? 'Support';

  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div className="max-w-[85%]">
        <p className={cn('m-0 mb-1 text-[11px] text-[#646970]', mine && 'text-right')}>
          {label}
          {message.role === 'visitor' && ` · ${message.mode === 'support' ? 'to Support' : 'to Agent'}`}
          {' · '}
          <time dateTime={message.createdAt} suppressHydrationWarning>
            {when(message.createdAt)}
          </time>
        </p>
        <div
          className={cn(
            'whitespace-pre-wrap break-words rounded-sm border px-3 py-2 text-[13px] leading-relaxed',
            message.role === 'visitor' && 'border-[#c3c4c7] bg-white text-[#1d2327]',
            message.role === 'bot' && 'border-[#c5d9ed] bg-[#f0f6fc] text-[#1d2327]',
            mine && 'border-[#68de7c] bg-[#edfaef] text-[#1d2327]'
          )}
        >
          {message.role === 'bot' ? <AgentText text={message.body} /> : message.body}
        </div>
      </div>
    </div>
  );
}
