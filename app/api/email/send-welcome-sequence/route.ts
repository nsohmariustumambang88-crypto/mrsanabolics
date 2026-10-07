'use server';

import { NextRequest, NextResponse } from 'next/server';
import {
  sendScheduledWelcomeEmail2,
  sendScheduledWelcomeEmail3,
} from '@/lib/email/welcome-sequence';

/**
 * Cron endpoint to send scheduled welcome emails.
 * Call this endpoint periodically (e.g., every 5-10 minutes) to send emails 2 and 3.
 *
 * Protected by a secret token to prevent unauthorized calls.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [result2, result3] = await Promise.all([
      sendScheduledWelcomeEmail2(),
      sendScheduledWelcomeEmail3(),
    ]);

    return NextResponse.json({
      ok: true,
      email2: result2,
      email3: result3,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Welcome sequence cron error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
