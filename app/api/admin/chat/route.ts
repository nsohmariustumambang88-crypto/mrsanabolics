import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth';
import { isChatFilter, listConversations } from '@/lib/chat';

/*
  The inbox list, for the admin screen's refresh.

  Middleware does not cover /api/admin routes, and a cookie's signature is not enough anyway: this
  re-reads the account from Postgres, as every admin export does, before handing over anyone's
  conversations.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: 'Sign in again.' }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const filter = params.get('filter');
  const result = await listConversations(isChatFilter(filter) ? filter : 'waiting', params.get('q') ?? '');
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}
