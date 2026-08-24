'use client';

import * as React from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

export function AnnouncementBar() {
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    setDismissed(sessionStorage.getItem('mranabolics-notice') === 'dismissed');
  }, []);

  if (dismissed) return null;

  return (
    <div className="relative border-b border-rule bg-field-indigo text-field-foreground">
      <div className="mx-auto flex max-w-[86rem] items-center justify-center gap-3 px-10 py-2 text-center">
        <p className="text-xs leading-relaxed">
          Certificates of analysis now published with every batch.{' '}
          <Link
            href="/faq"
            className="underline decoration-field-foreground/40 underline-offset-4 transition-colors hover:decoration-field-foreground"
          >
            How testing works
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
