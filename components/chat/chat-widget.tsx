'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, X, Send, Check } from 'lucide-react';
import {
  MAX_MESSAGE_LENGTH,
  VISITOR_POLL_MS,
  type ChatMessageDto,
  type ChatModeName,
} from '@/lib/chat/shared';
import { cn } from '@/lib/utils';

/*
  The storefront chat: a button in the corner and a panel above it.

  IT OPENS EMPTY. No greeting pretending to be a person, no suggested questions: the panel shows
  only messages that were actually sent, and the two modes say what each one does.

  TWO MODES, ALWAYS VISIBLE, SWITCHABLE AT ANY TIME.
  - Agent (indigo) answers straight away from the store's own delivery, payment and stock settings.
  - Support (verdigris) goes to the Live Chat inbox in the admin, where a person replies.

  KEPT CURRENT BY POLLING every two seconds while the panel is open and the tab is visible, asking
  only for messages newer than the last one held. Closed, it checks every twenty seconds and only
  if this browser has ever chatted, so a staff reply can light the button. A browser that has never
  sent a message sends no requests at all.

  The conversation is tied to this browser by an httpOnly cookie the server sets; this component
  never sees it. What it remembers in localStorage is only that a chat exists and whether an
  address was left, so it knows whether to poll and whether to offer the box again.

  No motion, like the rest of the site. Opaque surfaces, shadow with offset and blur.
*/

const STARTED_KEY = 'mranabolics-chat-started';
const DETAILS_KEY = 'mranabolics-chat-details';
const CLOSED_POLL_MS = 20_000;

function readFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string) {
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    /* Private windows refuse storage. The chat still works; it just forgets between visits. */
  }
}

function merge(existing: ChatMessageDto[], incoming: ChatMessageDto[]): ChatMessageDto[] {
  if (incoming.length === 0) return existing;
  const seen = new Set(existing.map((m) => m.id));
  const added = incoming.filter((m) => !seen.has(m.id));
  return added.length ? [...existing, ...added] : existing;
}

const time = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [mode] = React.useState<ChatModeName>('support'); // Always support mode
  const [messages, setMessages] = React.useState<ChatMessageDto[]>([]);
  const [draft, setDraft] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [started, setStarted] = React.useState(false);
  const [unread, setUnread] = React.useState(false);
  const [detailsGiven, setDetailsGiven] = React.useState(false);

  const launcher = React.useRef<HTMLButtonElement>(null);
  const composer = React.useRef<HTMLTextAreaElement>(null);
  const scroller = React.useRef<HTMLDivElement>(null);
  const honeypot = React.useRef<HTMLInputElement>(null);
  const latest = React.useRef<string | null>(null);
  const seenCount = React.useRef(0);
  /* False until the history that already existed has loaded, so old replies never light the dot. */
  const baselined = React.useRef(false);

  React.useEffect(() => {
    setStarted(readFlag(STARTED_KEY));
    setDetailsGiven(readFlag(DETAILS_KEY));
  }, []);

  latest.current = messages.length ? messages[messages.length - 1].createdAt : null;

  const poll = React.useCallback(async () => {
    try {
      const after = latest.current ? `?after=${encodeURIComponent(latest.current)}` : '';
      const res = await fetch(`/api/chat/visitor/messages${after}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data: { messages: ChatMessageDto[] } = await res.json();
      setMessages((current) => merge(current, data.messages));
    } catch {
      /* A missed poll is retried on the next tick. */
    }
  }, []);

  /* Open: every two seconds, while the tab is visible. */
  React.useEffect(() => {
    if (!open || !started) return;
    void poll();
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void poll();
    }, VISITOR_POLL_MS);
    return () => window.clearInterval(id);
  }, [open, started, poll]);

  /* Closed: rarely, and only for a browser that has a conversation, to notice a reply. */
  React.useEffect(() => {
    if (open || !started) return;
    if (!baselined.current) void poll();
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void poll();
    }, CLOSED_POLL_MS);
    return () => window.clearInterval(id);
  }, [open, started, poll]);

  /* A reply that arrives while the panel is closed lights the button. */
  React.useEffect(() => {
    if (open || !baselined.current) {
      seenCount.current = messages.length;
      if (messages.length > 0 || open) baselined.current = true;
      setUnread(false);
      return;
    }
    const fresh = messages.slice(seenCount.current);
    if (fresh.some((m) => m.role !== 'visitor')) setUnread(true);
  }, [messages, open]);

  React.useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, open, sending]);

  React.useEffect(() => {
    if (!open) return;
    composer.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        launcher.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/chat/visitor/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, mode, path: pathname, website: honeypot.current?.value ?? '' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? 'That did not send. Try again.');
        return;
      }
      setDraft('');
      setMessages((current) => merge(current, data?.messages ?? []));
      if (!started) {
        writeFlag(STARTED_KEY);
        setStarted(true);
      }
    } catch {
      setError('That did not send. Check your connection and try again.');
    } finally {
      setSending(false);
      composer.current?.focus();
    }
  };

  const wroteToSupport = messages.some((m) => m.role === 'visitor' && m.mode === 'support');

  return (
    <>
      {open && (
        <section
          id="site-chat"
          role="dialog"
          aria-label="Chat"
          className="fixed bottom-[5.25rem] right-4 z-40 flex max-h-[min(42rem,calc(100dvh-7rem))] w-[calc(100vw-2rem)] max-w-[24rem] flex-col border border-rule-strong bg-card shadow-lift-strong sm:right-6"
        >
          <header className="flex items-start justify-between gap-3 border-b border-rule px-4 py-3">
            <div className="min-w-0">
              <h2 className="font-display text-base font-semibold tracking-[-0.02em] text-ink">
                Support
              </h2>
              <p className="mt-0.5 text-xs leading-snug text-ink-faint">
                A person reads this and replies here.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                launcher.current?.focus();
              }}
              className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-paper-sunk hover:text-ink"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </header>

          <div
            ref={scroller}
            className="min-h-[8rem] flex-1 space-y-4 overflow-y-auto px-4 py-4"
            aria-live="polite"
            aria-relevant="additions"
          >
            {messages.map((m) => (
              <Bubble key={m.id} message={m} />
            ))}
          </div>

          {mode === 'support' && wroteToSupport && !detailsGiven && (
            <DetailsForm
              onSaved={() => {
                writeFlag(DETAILS_KEY);
                setDetailsGiven(true);
              }}
            />
          )}

          <div className="border-t border-rule px-3 pb-3 pt-3">
            {error && (
              <p className="mt-2 text-xs text-destructive" role="alert">
                {error}
              </p>
            )}

            <form
              className="mt-3 flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              {/* No person sees or fills this. A bot that does is answered like a success. */}
              <input
                ref={honeypot}
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute -left-[9999px] h-px w-px opacity-0"
              />
              <label htmlFor="site-chat-input" className="sr-only">
                Message to support
              </label>
              <textarea
                id="site-chat-input"
                ref={composer}
                rows={2}
                maxLength={MAX_MESSAGE_LENGTH}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Write to support"
                className="min-h-[2.75rem] flex-1 resize-none border border-rule-strong bg-paper px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-pigment-indigo"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-pigment-verdigris text-paper transition-colors disabled:opacity-40"
                aria-label="Send"
              >
                <Send className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </form>
          </div>
        </section>
      )}

      <button
        ref={launcher}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="site-chat"
        aria-label={open ? 'Close chat' : unread ? 'Open chat, new reply' : 'Open chat'}
        className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-sm border border-ink bg-ink text-paper shadow-lift transition-colors hover:bg-pigment-indigo sm:right-6"
      >
        {open ? <X className="h-5 w-5" strokeWidth={1.75} /> : <MessageSquare className="h-5 w-5" strokeWidth={1.75} />}
        {unread && !open && (
          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-paper bg-pigment-madder" aria-hidden="true" />
        )}
      </button>
    </>
  );
}

function Bubble({ message }: { message: ChatMessageDto }) {
  const visitor = message.role === 'visitor';
  const staff = message.role === 'staff';

  return (
    <div className={cn('flex flex-col', visitor ? 'items-end' : 'items-start')}>
      {!visitor && (
        <p className="mb-1 font-mono text-2xs uppercase tracking-[0.12em] text-pigment-verdigris">
          Support
        </p>
      )}
      <div
        className={cn(
          'max-w-[85%] whitespace-pre-wrap break-words px-3 py-2 text-sm leading-relaxed',
          visitor && 'bg-ink text-paper',
          staff && 'border border-pigment-verdigris text-ink'
        )}
        style={staff ? { backgroundColor: 'hsl(var(--pig-verdigris) / 0.08)' } : undefined}
      >
        {message.body && <RichText text={message.body} />}
      </div>
      <time dateTime={message.createdAt} className="mt-1 font-mono text-2xs tabular text-ink-faint">
        {time(message.createdAt)}
      </time>
    </div>
  );
}

/*
  The agent's replies may carry **bold** and [links](/path). Only links to this site become links;
  anything else stays as its label. Text is never parsed as HTML.
*/
function RichText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let key = 0;
  for (const m of Array.from(text.matchAll(pattern))) {
    const at = m.index ?? 0;
    if (at > last) parts.push(text.slice(last, at));
    const [, bold, label, href] = m;
    if (bold !== undefined) {
      parts.push(
        <strong key={key++} className="font-semibold">
          {bold}
        </strong>
      );
    } else if (label !== undefined) {
      parts.push(
        href.startsWith('/') && !href.startsWith('//') ? (
          <Link key={key++} href={href} className="text-pigment-indigo underline underline-offset-2">
            {label}
          </Link>
        ) : (
          label
        )
      );
    }
    last = at + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function DetailsForm({ onSaved }: { onSaved: () => void }) {
  const [email, setEmail] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  if (saved) {
    return (
      <p className="flex items-center gap-2 border-t border-rule px-4 py-2.5 text-xs text-pigment-verdigris">
        <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        Saved. A person can write to you there if you close this chat.
      </p>
    );
  }

  return (
    <form
      className="border-t border-rule px-4 py-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const res = await fetch('/api/chat/visitor/details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          const data = await res.json().catch(() => null);
          if (!res.ok) {
            setError(data?.error ?? 'That did not save. Try again.');
            return;
          }
          setSaved(true);
          onSaved();
        } catch {
          setError('That did not save. Check your connection.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor="site-chat-email" className="text-xs leading-snug text-ink-soft">
        Might you leave before we reply? Add your email so a person can write to you. We won&apos;t
        add you to any mailing list.
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="site-chat-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@domain.com"
          className="min-w-0 flex-1 border border-rule-strong bg-paper px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-pigment-verdigris"
        />
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="shrink-0 border border-pigment-verdigris px-3 text-xs font-medium text-pigment-verdigris transition-colors hover:bg-paper-sunk disabled:opacity-40"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
