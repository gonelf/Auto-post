import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getUserById } from '@/lib/db/users';
import { searchSubreddits } from '@/lib/reddit/subreddits';
import { decryptToken } from '@/lib/crypto';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 25);

  if (!q || q.length < 2) {
    return NextResponse.json({ subreddits: [] });
  }

  const user = await getUserById(session.user.userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const accessToken = decryptToken(user.access_token);
  const subreddits = await searchSubreddits(q, accessToken, limit);

  return NextResponse.json({ subreddits });
}
