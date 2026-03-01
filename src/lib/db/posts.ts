import { getDbClient, dbCall, isNotFound } from './client';
import type { PostRow, PostFilters } from './types';
import type { PostCreatePayload } from '@/types/post';

export async function getPostsByUser(
  userId: string,
  filters: PostFilters = {}
): Promise<{ posts: PostRow[]; total: number }> {
  const db = getDbClient();
  const { page = 1, limit = 20, status } = filters;

  let filter = `user_id = "${userId}"`;
  if (status) filter += ` && status = "${status}"`;

  const result = await dbCall(() =>
    db.collection<PostRow>('posts').getList(page, limit, {
      filter,
      sort: '-created',
    })
  );

  return { posts: result.items, total: result.totalItems };
}

export async function getPostById(id: string, userId: string): Promise<PostRow | null> {
  const db = getDbClient();
  try {
    const post = await dbCall(() => db.collection<PostRow>('posts').getOne(id));
    // Enforce ownership
    if (post.user_id !== userId) return null;
    return post;
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export async function createPost(
  userId: string,
  payload: PostCreatePayload
): Promise<PostRow> {
  const db = getDbClient();
  const scheduledAt = payload.scheduled_at || new Date().toISOString();

  return dbCall(() =>
    db.collection<PostRow>('posts').create({
      user_id: userId,
      post_type: payload.post_type,
      title: payload.title,
      subreddit: payload.subreddit,
      body_text: payload.body_text || null,
      link_url: payload.link_url || null,
      image_url: payload.image_url || null,
      image_storage_key: payload.image_storage_key || null,
      status: 'scheduled',
      scheduled_at: scheduledAt,
      retry_count: 0,
    })
  );
}

export async function updatePost(
  id: string,
  userId: string,
  updates: Partial<PostRow>
): Promise<PostRow | null> {
  const db = getDbClient();

  const existing = await getPostById(id, userId);
  if (!existing) return null;
  if (existing.status !== 'draft' && existing.status !== 'scheduled') return null;

  return dbCall(() =>
    db.collection<PostRow>('posts').update(id, updates as Record<string, unknown>)
  );
}

export async function deletePost(id: string, userId: string): Promise<boolean> {
  const db = getDbClient();

  const existing = await getPostById(id, userId);
  if (!existing) return false;

  try {
    await dbCall(() => db.collection('posts').delete(id));
    return true;
  } catch (err) {
    if (isNotFound(err)) return false;
    throw err;
  }
}

export async function getPostStats(userId: string) {
  const db = getDbClient();
  const posts = await dbCall(() =>
    db.collection<PostRow>('posts').getFullList({
      filter: `user_id = "${userId}"`,
      fields: 'status',
    })
  );

  const stats = { total: 0, scheduled: 0, posted: 0, failed: 0 };
  for (const row of posts) {
    stats.total++;
    if (row.status === 'scheduled' || row.status === 'posting') stats.scheduled++;
    else if (row.status === 'posted') stats.posted++;
    else if (row.status === 'failed') stats.failed++;
  }
  return stats;
}

// ── Scheduler-specific queries ──────────────────────────────────────────────

export async function getSchedulerDuePosts(limit = 50): Promise<PostRow[]> {
  const db = getDbClient();
  // Include a 30-second buffer to catch near-due posts
  const cutoff = new Date(Date.now() + 30_000).toISOString();

  const result = await dbCall(() =>
    db.collection<PostRow>('posts').getList(1, limit, {
      filter: `status = "scheduled" && scheduled_at <= "${cutoff}" && retry_count < 3`,
      sort: 'scheduled_at',
    })
  );

  return result.items;
}

/**
 * Optimistic lock: set status to 'posting' only if it's still 'scheduled'.
 * Returns true if we acquired the lock.
 *
 * Note: Tacobase doesn't support conditional updates natively, so we
 * check-then-update. Acceptable for low-concurrency cron scenarios.
 */
export async function lockPostForProcessing(id: string): Promise<boolean> {
  const db = getDbClient();

  let post: PostRow;
  try {
    post = await dbCall(() => db.collection<PostRow>('posts').getOne(id));
  } catch (err) {
    if (isNotFound(err)) return false;
    throw err;
  }

  if (post.status !== 'scheduled') return false;

  await dbCall(() =>
    db.collection<PostRow>('posts').update(id, { status: 'posting' })
  );

  return true;
}

export async function markPostPosted(
  id: string,
  redditPostId: string,
  redditPostUrl: string
): Promise<void> {
  const db = getDbClient();
  await dbCall(() =>
    db.collection('posts').update(id, {
      status: 'posted',
      reddit_post_id: redditPostId,
      reddit_post_url: redditPostUrl,
      posted_at: new Date().toISOString(),
    })
  );
}

export async function markPostFailed(
  id: string,
  retryCount: number,
  failureReason: string,
  rescheduleAt?: string
): Promise<void> {
  const db = getDbClient();
  const isFinal = retryCount >= 3;

  const updateData: Record<string, unknown> = {
    status: isFinal ? 'failed' : 'scheduled',
    retry_count: retryCount,
    failure_reason: failureReason,
  };
  if (!isFinal && rescheduleAt) {
    updateData.scheduled_at = rescheduleAt;
  }

  await dbCall(() => db.collection('posts').update(id, updateData));
}

/**
 * Recover posts stuck in 'posting' status due to server crashes.
 * Resets them to 'scheduled' if they haven't been updated in 5 minutes.
 * Uses Tacobase's auto-managed 'updated' timestamp for the stale check.
 */
export async function recoverStalePostingPosts(): Promise<number> {
  const db = getDbClient();
  const staleCutoff = new Date(Date.now() - 5 * 60_000).toISOString();

  let stalePosts: PostRow[];
  try {
    stalePosts = await dbCall(() =>
      db.collection<PostRow>('posts').getFullList({
        filter: `status = "posting" && updated < "${staleCutoff}"`,
        fields: 'id',
      })
    );
  } catch (err) {
    console.error('Failed to query stale posting posts:', err);
    return 0;
  }

  let recovered = 0;
  for (const post of stalePosts) {
    try {
      await dbCall(() =>
        db.collection('posts').update(post.id, { status: 'scheduled' })
      );
      recovered++;
    } catch (err) {
      console.error(`Failed to recover post ${post.id}:`, err);
    }
  }

  return recovered;
}
