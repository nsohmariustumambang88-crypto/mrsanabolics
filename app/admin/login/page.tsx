import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { BullEmblem } from '@/components/brand/bull-emblem';
import '../wp-admin.css';

/*
  Sign in — modelled on wp-login.php rather than on the dashboard.

  WordPress gives this screen its own layout for a reason: there is no menu to show and no
  chrome to keep consistent, so it centres a single narrow card on the grey field with the
  mark above it. Copying the dashboard shell here would put an empty admin bar over a form.

  The mechanics are unchanged and deliberately plain. A server component posting natively to
  /api/admin/login, which sets the cookie and answers with a 303. No client JavaScript is
  involved in the redirect, which is what makes it reliable — the earlier fetch-then-navigate
  version set a valid cookie and then failed to move the browser. It also means login still
  works if the bundle fails to load.

  Errors come back as a query parameter rather than component state, because after a native
  POST there is no state to come back to.

  The stylesheet is imported here as well as in the dashboard layout: this route sits outside
  that layout, so it would otherwise reference wp- classes that were never loaded.
*/

export const dynamic = 'force-dynamic';

const MESSAGES: Record<string, string> = {
  invalid: 'Those details do not match an account.',
  missing: 'Enter your email and password.',
  throttled: 'Too many attempts. Wait fifteen minutes and try again.',
};

/** Only same-site paths: `?next=` must not become an open redirect. */
function safeNext(raw?: string): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/admin';
  return raw;
}

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const next = safeNext(searchParams.next);
  const error = searchParams.error ? MESSAGES[searchParams.error] : null;

  return (
    <div className="wp-admin flex min-h-screen flex-col items-center px-3 py-12">
      <Link href="/" className="mb-6 inline-flex items-center gap-2.5 no-underline">
        <BullEmblem className="h-10 w-10" />
        <span className="text-[20px] font-semibold" style={{ color: 'var(--wp-text)' }}>
          MrAnabolics
        </span>
      </Link>

      {error && (
        <div className="wp-notice wp-notice-error w-full max-w-[320px]" role="alert">
          <p className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
            {error}
          </p>
        </div>
      )}

      <form
        method="post"
        action="/api/admin/login"
        className="w-full max-w-[320px] border border-[#c3c4c7] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
      >
        <input type="hidden" name="next" value={next} />

        <p className="mb-4">
          <label htmlFor="email" className="wp-label">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            autoFocus
            className="wp-input"
          />
        </p>

        <p className="mb-4">
          <label htmlFor="password" className="wp-label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="wp-input"
          />
        </p>

        <p className="mt-5 text-right">
          <button type="submit" className="wp-button wp-button-primary">
            Log In
          </button>
        </p>
      </form>

      <p className="mt-4 w-full max-w-[320px] text-[13px]">
        <Link href="/">&larr; Go to MrAnabolics</Link>
      </p>

      <p className="mt-6 w-full max-w-[320px] text-[12px] leading-relaxed wp-muted">
        Restricted area. Sessions last seven days and are revoked when the password changes.
      </p>
    </div>
  );
}
