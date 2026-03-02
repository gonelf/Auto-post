import { NextRequest, NextResponse } from 'next/server';
import { processDuePosts } from '@/lib/scheduler/processor';

export const maxDuration = 60; // seconds (Vercel Pro limit; adjust for your host)

export async function GET(request: NextRequest) {
  // Validate cron secret to prevent unauthorized triggers
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processDuePosts();
    console.log('Cron run complete:', result);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('Cron run failed:', err);
    return NextResponse.json(
      { error: 'Cron run failed', message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
