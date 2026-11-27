import type { NextRequest } from 'next/server';
import { handleDailyCron } from '@/lib/automation/registry';

/*
  The one daily timer (vercel.json, DAILY_CRON in lib/automation/jobs.ts): the owner's decision of
  27 November 2026. Runs the due jobs in order inside this one call: unpaid order reminders,
  basket reminders, then the enquiry alert and, on Saturdays, the weekly report, those two only
  while switched on. Every job keeps its own switch, pause, approval, postal-address check and
  lock. Fails closed without CRON_SECRET.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export function GET(request: NextRequest) {
  return handleDailyCron(request);
}
