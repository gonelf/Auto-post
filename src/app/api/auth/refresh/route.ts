import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getUserById, updateTokensIfExpired } from '@/lib/db/users';
import { refreshAccessToken, tokenExpiresAt } from '@/lib/reddit/auth';
import { encryptToken, decryptToken } from '@/lib/crypto';

export async function POST() {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getUserById(session.user.userId);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  try {
    const plainRefreshToken = decryptToken(user.refresh_token);
    const tokens = await refreshAccessToken({
      refreshToken: plainRefreshToken,
      clientId: process.env.REDDIT_CLIENT_ID!,
      clientSecret: process.env.REDDIT_CLIENT_SECRET!,
    });

    await updateTokensIfExpired({
      userId: user.id,
      access_token: encryptToken(tokens.access_token),
      refresh_token: tokens.refresh_token
        ? encryptToken(tokens.refresh_token)
        : user.refresh_token,
      token_expires_at: tokenExpiresAt(tokens.expires_in),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Token refresh failed:', err);
    // If refresh fails, the user's access has been revoked — log them out
    session.destroy();
    return NextResponse.json(
      { error: 'Token refresh failed. Please log in again.' },
      { status: 401 }
    );
  }
}
