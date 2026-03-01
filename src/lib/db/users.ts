import { getDbClient, dbCall, isNotFound } from './client';
import type { UserRow } from './types';

export async function getUserById(id: string): Promise<UserRow | null> {
  const db = getDbClient();
  try {
    return await dbCall(() => db.collection<UserRow>('users').getOne(id));
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export async function getUserByRedditId(redditUserId: string): Promise<UserRow | null> {
  const db = getDbClient();
  try {
    return await dbCall(() =>
      db.collection<UserRow>('users').getFirstListItem(`reddit_user_id = "${redditUserId}"`)
    );
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export interface UpsertUserParams {
  reddit_user_id: string;
  reddit_username: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  avatar_url?: string | null;
}

/** Create or update a user record matched by reddit_user_id. */
export async function upsertUser(params: UpsertUserParams): Promise<UserRow> {
  const db = getDbClient();

  const existing = await getUserByRedditId(params.reddit_user_id);

  if (existing) {
    return dbCall(() =>
      db.collection<UserRow>("users").update(existing.id, { ...params })
    );
  }

  return dbCall(() =>
    db.collection<UserRow>("users").create({ ...params })
  );
}

export interface UpdateTokensParams {
  userId: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
}

/**
 * Update tokens only if the stored token is currently expired.
 * Returns the updated row, or null if another instance already refreshed.
 */
export async function updateTokensIfExpired(
  params: UpdateTokensParams
): Promise<UserRow | null> {
  const user = await getUserById(params.userId);
  if (!user) return null;

  // Only update if token is still expired (guards against concurrent double-refresh)
  if (new Date(user.token_expires_at).getTime() >= Date.now()) return null;

  const db = getDbClient();
  return dbCall(() =>
    db.collection<UserRow>('users').update(params.userId, {
      access_token: params.access_token,
      refresh_token: params.refresh_token,
      token_expires_at: params.token_expires_at,
    })
  );
}

export async function deleteUser(id: string): Promise<void> {
  const db = getDbClient();
  try {
    await dbCall(() => db.collection('users').delete(id));
  } catch (err) {
    if (!isNotFound(err)) throw err;
  }
}
