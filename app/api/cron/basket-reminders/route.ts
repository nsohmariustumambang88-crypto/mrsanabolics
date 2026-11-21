import type { NextRequest } from 'next/server';
import { handleCron } from '@/lib/automation/registry';

/*
  Vercel Cron (vercel.json) calls this once a day. It runs the "basket-reminders" job through
  lib/automation/run.ts: switches, lock, run log, cap and pacing. Fails closed without CRON_SECRET.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export function GET(request: NextRequest) {
  return handleCron(request, 'basket-reminders');
}
