'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/*
  The two interactive pieces of the wp-admin kit.

  WpNotice is the dismissible banner from the reference screenshot: white ground, a 4px left
  border carrying the state colour, and a dismiss control at the right edge. Dismissal is
  remembered in localStorage under a caller-supplied id, because a notice that returns on
  every page load is the thing everyone hates about the WordPress dashboard, and reproducing
  the look of that screen is not a reason to reproduce its worst habit.

  WpScreenMeta is the Screen Options / Help pair that sits above the page title. In WordPress
  these toggle real panels, so they do here too — an ornamental tab that opens nothing would
  be a lie about what the interface does.
*/

type Tone = 'success' | 'error' | 'warning' | 'info';

export function WpNotice({
  id,
  tone = 'info',
  dismissible = true,
  children,
}: {
  /** Stable key for remembering dismissal. Omit `dismissible` to make the notice permanent. */
  id?: string;
  tone?: Tone;
  dismissible?: boolean;
  children: React.ReactNode;
}) {
  /*
    Start visible and hide after mount if it was dismissed before. The reverse — start hidden,
    reveal once storage is read — flashes an empty gap into the layout on every load, and the
    server has no way to know the answer either way.
  */
  const [gone, setGone] = React.useState(false);

  React.useEffect(() => {
    if (!id) return;
    try {
      if (window.localStorage.getItem(`wp-notice-dismissed:${id}`) === '1') setGone(true);
    } catch {
      /* Private windows and blocked site data both throw here. A notice that shows one extra
         time is a far better failure than an admin screen that throws on load. */
    }
  }, [id]);

  if (gone) return null;

  const dismiss = () => {
    setGone(true);
    if (!id) return;
    try {
      window.localStorage.setItem(`wp-notice-dismissed:${id}`, '1');
    } catch {
      /* Nothing to do — it will simply appear again next time. */
    }
  };

  return (
    <div
      className={cn('wp-notice', `wp-notice-${tone}`, dismissible && 'is-dismissible')}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}

      {dismissible && (
        <button type="button" className="wp-notice-dismiss" onClick={dismiss}>
          <X className="h-4 w-4" strokeWidth={2} />
          <span className="wp-screen-reader-text">Dismiss this notice</span>
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- screen meta */

export function WpScreenMeta({
  help,
  options,
}: {
  help: React.ReactNode;
  options?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState<'help' | 'options' | null>(null);

  return (
    <div className="-mx-3 md:-mx-5">
      {open && (
        <div className="wp-screen-panel">{open === 'help' ? help : options}</div>
      )}

      <div className="wp-screen-meta-tabs">
        {options && (
          <button
            type="button"
            className="wp-screen-tab"
            aria-expanded={open === 'options'}
            onClick={() => setOpen((v) => (v === 'options' ? null : 'options'))}
          >
            Screen Options {open === 'options' ? '▴' : '▾'}
          </button>
        )}
        <button
          type="button"
          className="wp-screen-tab"
          aria-expanded={open === 'help'}
          onClick={() => setOpen((v) => (v === 'help' ? null : 'help'))}
        >
          Help {open === 'help' ? '▴' : '▾'}
        </button>
      </div>
    </div>
  );
}
