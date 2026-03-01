import { getDbClient, DatabaseError } from './client';
import type { PostRow, PostFilters } from './types';
import type { PostCreatePayload } from '@/types/post';

export async function getPostsByUser(
  userId: string,
  filters: PostFilters = {}
): Promise<{ posts: PostRow[]; total: number }> {
  const db = getDbClient();
  const { page = 1, limit = 20, status } = filters;
  const offset = (page - 1) * limit;

  let query = db
    .from('posts')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;
  if (error) throw new DatabaseError(error.message);
  return { posts: (data as PostRow[]) || [], total: count || 0 };
}

export async function getPostById(id: string, userId: string): Promise<PostRow | null> {
  const db = getDbClient();
  const { data, error } = await db
    .from('posts')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new DatabaseError(error.message);
  }
  return data as PostRow;
}

export async function createPost(
  userId: string,
  payload: PostCreatePayload
): Promise<PostRow> {
  const db = getDbClient();
  const scheduledAt = payload.scheduled_at || new Date().toISOString();

  const { data, error } = await db
    .from('posts')
    .insert({
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
    .select()
    .single();
  if (error) throw new DatabaseError(error.message);
  return data as PostRow;
}

export async function updatePost(
  id: string,
  userId: string,
  updates: Partial<PostRow>
): Promise<PostRow | null> {
  const db = getDbClient();
  const { data, error } = await db
    .from('posts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .in('status', ['draft', 'scheduled'])
    .select()
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new DatabaseError(error.message);
  }
  return data as PostRow;
}

export async function deletePost(id: string, userId: string): Promise<boolean> {
  const db = getDbClient();
  const { error, count } = await db
    .from('posts')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw new DatabaseError(error.message);
  return (count || 0) > 0;
}

export async function getPostStats(userId: string) {
  const db = getDbClient();
  const { data, error } = await db
    .from('posts')
    .select('status')
    .eq('user_id', userId);
  if (error) throw new DatabaseError(error.message);

  const stats = { total: 0, scheduled: 0, posted: 0, failed: 0 };
  for (const row of (data as { status: string }[]) || []) {
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
  const { data, error } = await db
    .from('posts')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', cutoff)
    .lt('retry_count', 3)
    .order('scheduled_at', { ascending: true })
    .limit(limit);
  if (error) throw new DatabaseError(error.message);
  return (data as PostRow[]) || [];
}

/**
 * Optimistic lock: set status to 'posting' only if it's still 'scheduled'.
 * Returns true if we acquired the lock (0 rows updated means another instance grabbed it).
 */
export async function lockPostForProcessing(id: string): Promise<boolean> {
  const db = getDbClient();
  const { data, error } = await db
    .from('posts')
    .update({ status: 'posting', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'scheduled')
    .select('id');
  if (error) throw new DatabaseError(error.message);
  return Array.isArray(data) && data.length > 0;
}

export async function markPostPosted(
  id: string,
  redditPostId: string,
  redditPostUrl: string
): Promise<void> {
  const db = getDbClient();
  const { error } = await db
    .from('posts')
    .update({
      status: 'posted',
      reddit_post_id: redditPostId,
      reddit_post_url: redditPostUrl,
      posted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw new DatabaseError(error.message);
}

export async function markPostFailed(
  id: string,
  retryCount: number,
  failureReason: string,
  rescheduleAt?: string
): Promise<void> {
  const db = getDbClient();
  const isFinal = retryCount >= 3;
  const { error } = await db
    .from('posts')
    .update({
      status: isFinal ? 'failed' : 'scheduled',
      retry_count: retryCount,
      failure_reason: failureReason,
      scheduled_at: isFinal ? undefined : rescheduleAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw new DatabaseError(error.message);
}

/**
 * Recover posts stuck in 'posting' status due to server crashes.
 * Resets them to 'scheduled' if they haven't been updated in 5 minutes.
 */
export async function recoverStalePostingPosts(): Promise<number> {
  const db = getDbClient();
  const staleCutoff = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data, error } = await db
    .from('posts')
    .update({
      status: 'scheduled',
      updated_at: new Date().toISOString(),
    })
    .eq('status', 'posting')
    .lt('updated_at', staleCutoff)
    .select('id');
  if (error) {
    // Non-fatal: log and continue
    console.error('Failed to recover stale posting posts:', error.message);
    return 0;
  }
  return Array.isArray(data) ? data.length : 0;
}
