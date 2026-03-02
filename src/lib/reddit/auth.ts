import { redditAuthFetch, redditFetch } from './client';
import type { RedditTokenResponse, RedditMeResponse } from '@/types/reddit';

const SCOPES = ['identity', 'submit', 'read'].join(' ');

/**
 * Build the Reddit OAuth authorization URL.
 */
export function buildAuthorizationUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL('https://www.reddit.com/api/v1/authorize');
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', params.state);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('duration', 'permanent');
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeCodeForTokens(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<RedditTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: params.redirectUri,
    code_verifier: params.codeVerifier,
  });

  return redditAuthFetch<RedditTokenResponse>(
    '/api/v1/access_token',
    params.clientId,
    params.clientSecret,
    {
      method: 'POST',
      body: body.toString(),
    }
  );
}

/**
 * Refresh an access token using a refresh token.
 */
export async function refreshAccessToken(params: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<RedditTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: params.refreshToken,
  });

  return redditAuthFetch<RedditTokenResponse>(
    '/api/v1/access_token',
    params.clientId,
    params.clientSecret,
    {
      method: 'POST',
      body: body.toString(),
    }
  );
}

/**
 * Fetch the authenticated Reddit user's profile.
 */
export async function fetchRedditMe(accessToken: string): Promise<RedditMeResponse> {
  return redditFetch<RedditMeResponse>('/api/v1/me', accessToken);
}

/**
 * Calculate the token expiry timestamp from expires_in seconds.
 */
export function tokenExpiresAt(expiresIn: number): string {
  return new Date(Date.now() + expiresIn * 1000).toISOString();
}
