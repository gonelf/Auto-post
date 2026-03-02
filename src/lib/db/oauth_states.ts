import { getDbClient, dbCall, isNotFound } from './client';
import type { OAuthStateRow } from './types';

export async function createOAuthState(params: {
  state: string;
  code_verifier: string;
  expires_at: string;
}): Promise<void> {
  const db = getDbClient();
  await dbCall(() => db.collection('oauth_states').create(params));
}

export async function consumeOAuthState(state: string): Promise<OAuthStateRow | null> {
  const db = getDbClient();

  let record: OAuthStateRow;
  try {
    // @now macro avoids client/server clock skew issues
    record = await dbCall(() =>
      db
        .collection<OAuthStateRow>('oauth_states')
        .getFirstListItem(`state = "${state}" && expires_at > @now`)
    );
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }

  // Delete it immediately — one-time use
  try {
    await dbCall(() => db.collection('oauth_states').delete(record.id));
  } catch {
    // Non-fatal: may already be consumed
  }

  return record;
}

/** Clean up expired states (call periodically or from cron). */
export async function pruneExpiredStates(): Promise<void> {
  const db = getDbClient();

  try {
    const expired = await dbCall(() =>
      db.collection<OAuthStateRow>('oauth_states').getFullList({
        filter: 'expires_at < @now',
        fields: 'id',
        skipTotal: true,
      })
    );
    for (const row of expired) {
      await db.collection('oauth_states').delete(row.id).catch(() => {});
    }
  } catch {
    // Non-fatal
  }
}
