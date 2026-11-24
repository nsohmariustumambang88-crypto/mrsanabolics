'use client';

/*
  Search logging is OFF (24 November 2026, the owner's decision): only payments and the visit
  count may call the server on their own, to keep the site inside Vercel's free allowance.

  It used to post every search term, debounced 900ms, to /api/track/search, which fed
  /admin/search ("searches that found nothing"). The route and the admin screen remain and show
  the terms logged until then. To switch it back on, restore this file from git history
  (it is the version before this comment).
*/

export function useSearchLog(_term: string, _resultCount: number): void {
  /* Deliberately nothing. */
}
