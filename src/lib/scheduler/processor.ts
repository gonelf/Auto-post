/**
 * Scheduler processor — core business logic for processing scheduled posts.
 *
 * Called by the /api/cron endpoint. Designed to be idempotent and safe
 * to run concurrently across multiple instances.
 */

import {
  getSchedulerDuePosts,
  lockPostForProcessing,
  markPostPosted,
  markPostFailed,
  recoverStalePostingPosts,
} from '@/lib/db/posts';
import { getUserById, updateTokensIfExpired } from '@/lib/db/users';
import { submitPost } from '@/lib/reddit/posts';
import { refreshAccessToken, tokenExpiresAt } from '@/lib/reddit/auth';
import { encryptToken, decryptToken } from '@/lib/crypto';
import { RateLimitError } from '@/lib/reddit/client';
import type { PostRow } from '@/lib/db/types';

export interface ProcessorResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number; // locked by another instance
}

/**
 * Exponential backoff schedule for retries.
 * retry 1: 5 minutes, retry 2: 25 minutes, retry 3: final failure
 */
function getRetryDelay(retryCount: number): number {
  const delays = [5 * 60_000, 25 * 60_000];
  return delays[retryCount] || 60_000;
}

/**
 * Get a valid access token for a user, refreshing if needed.
 * Handles the race condition where multiple posts process for the same user.
 */
async function getValidAccessToken(userId: string): Promise<string | null> {
  const user = await getUserById(userId);
  if (!user) return null;

  const expiresAt = new Date(user.token_expires_at);
  const needsRefresh = expiresAt.getTime() < Date.now() + 60_000;

  if (!needsRefresh) {
    return decryptToken(user.access_token);
  }

  // Refresh the token
  const clientId = process.env.REDDIT_CLIENT_ID!;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET!;

  try {
    const plainRefreshToken = decryptToken(user.refresh_token);
    const tokens = await refreshAccessToken({
      refreshToken: plainRefreshToken,
      clientId,
      clientSecret,
    });

    const newAccessToken = encryptToken(tokens.access_token);
    const newRefreshToken = tokens.refresh_token
      ? encryptToken(tokens.refresh_token)
      : user.refresh_token;
    const newExpiresAt = tokenExpiresAt(tokens.expires_in);

    // Conditional update — only applies if token is still expired
    // (prevents double refresh race condition)
    const updated = await updateTokensIfExpired({
      userId,
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_expires_at: newExpiresAt,
    });

    if (updated) {
      return tokens.access_token;
    }

    // Another instance already refreshed — re-read the fresh token
    const freshUser = await getUserById(userId);
    if (!freshUser) return null;
    return decryptToken(freshUser.access_token);
  } catch (err) {
    console.error(`Failed to refresh token for user ${userId}:`, err);
    return null;
  }
}

async function processPost(post: PostRow): Promise<'succeeded' | 'failed' | 'skipped'> {
  // Acquire optimistic lock
  const locked = await lockPostForProcessing(post.id);
  if (!locked) {
    return 'skipped'; // Another instance grabbed it
  }

  const accessToken = await getValidAccessToken(post.user_id);
  if (!accessToken) {
    await markPostFailed(
      post.id,
      post.retry_count + 1,
      'Failed to get valid access token. User may have revoked app access.',
      new Date(Date.now() + getRetryDelay(post.retry_count)).toISOString()
    );
    return 'failed';
  }

  try {
    const result = await submitPost(post, accessToken);
    await markPostPosted(post.id, result.postId, result.postUrl);
    return 'succeeded';
  } catch (err) {
    const retryCount = post.retry_count + 1;

    if (err instanceof RateLimitError) {
      const rescheduleAt = new Date(Date.now() + err.retryAfterSeconds * 1000).toISOString();
      const reason = `Rate limited by Reddit. Retrying at ${new Date(rescheduleAt).toUTCString()}`;
      // Don't count rate limiting as a retry failure — reset retry count
      await markPostFailed(post.id, post.retry_count, reason, rescheduleAt);
      return 'failed';
    }

    const errorMessage = err instanceof Error ? err.message : String(err);
    const rescheduleAt = new Date(Date.now() + getRetryDelay(post.retry_count)).toISOString();
    await markPostFailed(post.id, retryCount, errorMessage, rescheduleAt);
    return 'failed';
  }
}

/**
 * Main entry point: process all posts that are due.
 */
export async function processDuePosts(): Promise<ProcessorResult> {
  const result: ProcessorResult = { processed: 0, succeeded: 0, failed: 0, skipped: 0 };

  // Recover posts stuck in 'posting' status from crashed instances
  await recoverStalePostingPosts();

  const duePosts = await getSchedulerDuePosts(50);

  for (const post of duePosts) {
    result.processed++;
    const outcome = await processPost(post);
    result[outcome]++;
  }

  return result;
}
