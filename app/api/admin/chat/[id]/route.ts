import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth';
import { staffThread } from '@/lib/chat';

/*
  One conversation, for the thread the admin has open. Returns only what is newer than `after`,
  and marks the conversation read: the person polling it is looking at it.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: 'Sign in again.' }, { status: 401 });
  }

  const after = new URL(request.url).searchParams.get('after');
  const thread = await staffThread(params.id, after);
  if (!thread) return NextResponse.json({ error: 'That conversation no longer exists.' }, { status: 404 });
  return NextResponse.json(thread, { headers: { 'Cache-Control': 'no-store' } });
}
