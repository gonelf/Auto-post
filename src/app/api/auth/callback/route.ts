import { NextRequest, NextResponse } from 'next/server';
import { consumeOAuthState } from '@/lib/db/oauth_states';
import { exchangeCodeForTokens, fetchRedditMe, tokenExpiresAt } from '@/lib/reddit/auth';
import { upsertUser } from '@/lib/db/users';
import { encryptToken } from '@/lib/crypto';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

  if (error || error === 'access_denied') {
    return NextResponse.redirect(`${appUrl}/auth/error?error=access_denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/auth/error?error=missing_params`);
  }

  // Validate state (CSRF protection)
  const oauthState = await consumeOAuthState(state);
  if (!oauthState) {
    return NextResponse.redirect(`${appUrl}/auth/error?error=state_mismatch`);
  }

  const clientId = process.env.REDDIT_CLIENT_ID!;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET!;
  const redirectUri = process.env.REDDIT_REDIRECT_URI!;

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens({
      code,
      codeVerifier: oauthState.code_verifier,
      redirectUri,
      clientId,
      clientSecret,
    });

    // Fetch Reddit user profile
    const me = await fetchRedditMe(tokens.access_token);

    // Upsert user with encrypted tokens
    const user = await upsertUser({
      reddit_user_id: me.id,
      reddit_username: me.name,
      access_token: encryptToken(tokens.access_token),
      refresh_token: encryptToken(tokens.refresh_token),
      token_expires_at: tokenExpiresAt(tokens.expires_in),
      avatar_url: me.snoovatar_img || me.icon_img || null,
    });

    // Create session
    const session = await getSession();
    session.user = {
      userId: user.id,
      redditUsername: user.reddit_username,
      avatarUrl: user.avatar_url || undefined,
    };
    await session.save();

    return NextResponse.redirect(`${appUrl}/dashboard`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(`${appUrl}/auth/error?error=token_exchange_failed`);
  }
}
