'use client';

import * as React from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

/*
  The strip above the header.

  Its text and whether it appears at all now come from site settings, read on the server in the
  storefront layout and handed down — so an administrator changes the line in /admin/settings
  rather than a developer changing it here. The props carry defaults, so a caller that has not
  been updated, or a database that is asleep, still renders the sentence the site shipped with.
*/
export function AnnouncementBar({
  text = 'Ask for the certificate of analysis for your batch before you buy.',
  href = '/faq',
  linkLabel = 'How testing works',
}: {
  text?: string;
  href?: string;
  linkLabel?: string;
}) {
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    setDismissed(sessionStorage.getItem('mranabolics-notice') === 'dismissed');
  }, []);

  if (dismissed) return null;

  return (
    <div className="relative border-b border-rule bg-field-indigo text-field-foreground">
      <div className="mx-auto flex max-w-[86rem] items-center justify-center gap-3 px-10 py-2 text-center">
        <p className="text-xs leading-relaxed">
          {text}{' '}
          <Link
            href={href}
            className="underline decoration-field-foreground/40 underline-offset-4 transition-colors hover:decoration-field-foreground"
          >
            {linkLabel}
          </Link>
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          setDismissed(true);
          sessionStorage.setItem('mranabolics-notice', 'dismissed');
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-1 opacity-70 transition-opacity hover:opacity-100"
        aria-label="Dismiss notice"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
