import { NextResponse, type NextRequest } from 'next/server';
import { readSessionToken, SESSION_COOKIE } from '@/lib/auth/session';

/*
  Gate /admin at the edge.

  This runs before any admin page renders, so an unauthenticated request never reaches a
  component or a database query. It verifies the cookie's SIGNATURE only — it cannot reach
  Postgres from the edge runtime, so it cannot know whether the account still exists or
  whether its sessionVersion moved.

  That check happens again in requireAdmin() on every page and mutation. Two layers with
  different jobs: this one is cheap and keeps the bulk of traffic out; that one is
  authoritative and is what any real decision rests on.

  Note the import: lib/auth/session.ts is deliberately free of Node APIs. Importing
  lib/auth/index.ts here would drag Prisma and bcrypt into the edge bundle and fail to build.
*/

const LOGIN_PATH = '/admin/login';

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await readSessionToken(token);

  /* Already signed in and asking for the login page — send them to the dashboard. */
  if (pathname === LOGIN_PATH) {
    if (session) return NextResponse.redirect(new URL('/admin', request.url));
    return NextResponse.next();
  }

  if (!session) {
    const url = new URL(LOGIN_PATH, request.url);
    /* Remember where they were headed so login can return them there. */
    if (pathname !== '/admin') url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  /*
    /admin and everything under it. The login POST handler lives at /api/admin/login and is
    excluded on purpose — it has to be reachable while signed out.
  */
  matcher: ['/admin/:path*'],
};
