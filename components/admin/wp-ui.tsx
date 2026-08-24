import Link from 'next/link';
import { cn } from '@/lib/utils';

/*
  The presentational half of the wp-admin kit.

  Nothing here holds state, so nothing here is a client component — these render inside server
  pages and keep the data fetch on the server where it belongs. The interactive pieces (the
  dismissible notice, the Screen Options panel) live in wp-notice.tsx behind 'use client'.

  Class names are WordPress's own — .postbox, .wp-heading-inline, .subsubsub, .row-actions —
  because the CSS in app/admin/wp-admin.css is a transcription of wp-admin's, and matching the
  names is what lets the two be checked against each other.
*/

/* ------------------------------------------------------------------ postbox */

export function WpPostbox({
  title,
  action,
  footer,
  children,
  className,
}: {
  title: string;
  /** The link WordPress puts at the right of a widget header, e.g. "Manage". */
  action?: { href: string; label: string };
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('wp-postbox', className)}>
      <div className="wp-postbox-header">
        <h2 className="wp-postbox-title">{title}</h2>
        {action && (
          <Link href={action.href} className="text-[13px]">
            {action.label}
          </Link>
        )}
      </div>
      <div className="wp-postbox-inside">{children}</div>
      {footer && <div className="wp-postbox-footer">{footer}</div>}
    </section>
  );
}

/* -------------------------------------------------------------- page header */

/*
  wp-admin's page header is an h1 with an inline "Add New" pill beside it, then a hairline.
  The <hr className="wp-header-end"> is not decoration in WordPress — it is the marker that
  tells the admin where to inject notices. Keeping it means a notice lands in the same place
  here as it does there.
*/
export function WpPageHeader({
  title,
  action,
  subtitle,
  children,
}: {
  title: string;
  action?: { href: string; label: string };
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <>
      <h1 className="wp-heading-inline">{title}</h1>
      {action && (
        <Link href={action.href} className="wp-page-title-action">
          {action.label}
        </Link>
      )}
      {children}
      {subtitle && <p className="wp-subtitle">{subtitle}</p>}
      <hr className="my-2 border-0 border-t border-[#c3c4c7]" />
    </>
  );
}

/* ----------------------------------------------------------------- subsubsub */

/* The "All (12) | In stock (9) | Out of stock (3)" row above a list table. */
export function WpSubsubsub({
  items,
}: {
  items: { href: string; label: string; count: number; current: boolean }[];
}) {
  return (
    <ul className="wp-subsubsub">
      {items.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className={cn(item.current && 'current')}>
            {item.label} <span className="wp-count">({item.count})</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------- static notice */

/* A notice with nothing to dismiss — rendered on the server, no JavaScript involved. */
export function WpStaticNotice({
  tone = 'info',
  children,
}: {
  tone?: 'success' | 'error' | 'warning' | 'info';
  children: React.ReactNode;
}) {
  return (
    <div className={`wp-notice wp-notice-${tone}`}>
      <p>{children}</p>
    </div>
  );
}
