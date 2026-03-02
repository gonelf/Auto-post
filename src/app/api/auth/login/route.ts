import { NextResponse } from 'next/server';
import { generateCodeVerifier, generateCodeChallenge, generateOAuthState } from '@/lib/crypto';
import { buildAuthorizationUrl } from '@/lib/reddit/auth';
import { createOAuthState } from '@/lib/db/oauth_states';

export async function GET() {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const redirectUri = process.env.REDDIT_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'OAuth not configured' },
      { status: 500 }
    );
  }

  const state = generateOAuthState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Store state + verifier in DB (10 min TTL)
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  await createOAuthState({ state, code_verifier: codeVerifier, expires_at: expiresAt });

  const authUrl = buildAuthorizationUrl({
    clientId,
    redirectUri,
    state,
    codeChallenge,
  });

  return NextResponse.redirect(authUrl);
}
