import { getDbClient, DatabaseError } from './client';
import type { UserRow } from './types';

export async function getUserById(id: string): Promise<UserRow | null> {
  const db = getDbClient();
  const { data, error } = await db.from('users').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw new DatabaseError(error.message);
  }
  return data as UserRow;
}

export async function getUserByRedditId(redditUserId: string): Promise<UserRow | null> {
  const db = getDbClient();
  const { data, error } = await db
    .from('users')
    .select('*')
    .eq('reddit_user_id', redditUserId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new DatabaseError(error.message);
  }
  return data as UserRow;
}

export interface UpsertUserParams {
  reddit_user_id: string;
  reddit_username: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  avatar_url?: string | null;
}

export async function upsertUser(params: UpsertUserParams): Promise<UserRow> {
  const db = getDbClient();
  const { data, error } = await db
    .from('users')
    .upsert(
      {
        ...params,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'reddit_user_id' }
    )
    .select()
    .single();
  if (error) throw new DatabaseError(error.message);
  return data as UserRow;
}

export interface UpdateTokensParams {
  userId: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
}

/**
 * Conditionally update tokens only if they are currently expired.
 * Returns the updated row if updated, null if another process already refreshed.
 */
export async function updateTokensIfExpired(
  params: UpdateTokensParams
): Promise<UserRow | null> {
  const db = getDbClient();
  const now = new Date().toISOString();
  const { data, error } = await db
    .from('users')
    .update({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
      token_expires_at: params.token_expires_at,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.userId)
    .lt('token_expires_at', now) // only update if still expired
    .select()
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null; // 0 rows updated
    throw new DatabaseError(error.message);
  }
  return data as UserRow;
}

export async function deleteUser(id: string): Promise<void> {
  const db = getDbClient();
  const { error } = await db.from('users').delete().eq('id', id);
  if (error) throw new DatabaseError(error.message);
}
