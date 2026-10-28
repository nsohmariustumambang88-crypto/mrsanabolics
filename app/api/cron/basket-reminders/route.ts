import { NextResponse, type NextRequest } from 'next/server';
import { sendDueBasketReminders } from '@/lib/basket/reminders';

/*
  The daily basket-reminder run, called by Vercel Cron (vercel.json).

  Vercel sends `Authorization: Bearer <CRON_SECRET>` when the CRON_SECRET environment variable
  is set on the project. This route FAILS CLOSED: with no secret configured it refuses every
  call, so it can never be triggered by a stranger. Whether anything is actually sent is the
  `basket_reminders_enabled` setting (Settings → Email); with it off the run reports and exits.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET is not set on this deployment.' }, { status: 503 });
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorised.' }, { status: 401 });
  }
  try {
    const run = await sendDueBasketReminders();
    return NextResponse.json({ ok: true, ...run, sent: run.sent.length });
  } catch (error) {
    console.error('[cron basket-reminders] failed:', error);
    return NextResponse.json({ ok: false, error: 'The run failed; see the logs.' }, { status: 500 });
  }
}
