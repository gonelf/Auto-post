/**
 * Reddit API client with:
 * - Proper User-Agent header (required by Reddit)
 * - Rate limit header parsing
 * - Automatic retry detection
 */

const REDDIT_BASE_URL = 'https://oauth.reddit.com';
const REDDIT_AUTH_URL = 'https://www.reddit.com';
const USER_AGENT = 'web:com.redditautopost.app:v1.0.0 (by /u/reddit_autopost_bot)';

export interface RateLimitInfo {
  remaining: number;
  reset: number; // seconds until reset
  used: number;
}

export class RedditApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public rateLimitInfo?: RateLimitInfo
  ) {
    super(message);
    this.name = 'RedditApiError';
  }
}

export class RateLimitError extends RedditApiError {
  constructor(
    message: string,
    public retryAfterSeconds: number,
    rateLimitInfo?: RateLimitInfo
  ) {
    super(message, 429, rateLimitInfo);
    this.name = 'RateLimitError';
  }
}

function parseRateLimitHeaders(headers: Headers): RateLimitInfo {
  return {
    remaining: parseFloat(headers.get('x-ratelimit-remaining') || '600'),
    reset: parseFloat(headers.get('x-ratelimit-reset') || '600'),
    used: parseFloat(headers.get('x-ratelimit-used') || '0'),
  };
}

/**
 * Make an authenticated Reddit API request.
 */
export async function redditFetch<T>(
  path: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith('http') ? path : `${REDDIT_BASE_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'User-Agent': USER_AGENT,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...options.headers,
    },
  });

  const rateLimitInfo = parseRateLimitHeaders(response.headers);

  if (response.status === 429) {
    const retryAfter = rateLimitInfo.reset || 60;
    throw new RateLimitError(
      `Reddit rate limit exceeded. Retry after ${retryAfter}s`,
      retryAfter,
      rateLimitInfo
    );
  }

  if (!response.ok) {
    throw new RedditApiError(
      `Reddit API error: ${response.status} ${response.statusText}`,
      response.status,
      rateLimitInfo
    );
  }

  const data = await response.json();

  // Check for Reddit API-level errors (returned with 200 status)
  if (data?.json?.errors?.length > 0) {
    const [errorCode, errorMessage] = data.json.errors[0];
    if (errorCode === 'RATELIMIT') {
      // Parse retry time from message like "you are doing that too often. try again in 8 minutes."
      const minuteMatch = errorMessage?.match(/(\d+)\s+minute/);
      const secondMatch = errorMessage?.match(/(\d+)\s+second/);
      const retrySeconds = minuteMatch
        ? parseInt(minuteMatch[1]) * 60
        : secondMatch
        ? parseInt(secondMatch[1])
        : 600;
      throw new RateLimitError(
        `Reddit rate limit: ${errorMessage}`,
        retrySeconds,
        rateLimitInfo
      );
    }
    throw new RedditApiError(`Reddit error: ${errorCode} - ${errorMessage}`, 200, rateLimitInfo);
  }

  return data as T;
}

/**
 * Make an unauthenticated request to Reddit's auth endpoints.
 */
export async function redditAuthFetch<T>(
  path: string,
  clientId: string,
  clientSecret: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${REDDIT_AUTH_URL}${path}`;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(url, {
    ...options,
    headers: {
      'User-Agent': USER_AGENT,
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new RedditApiError(
      `Reddit auth error: ${response.status} ${response.statusText} - ${body}`,
      response.status
    );
  }

  return response.json() as Promise<T>;
}
