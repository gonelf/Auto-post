import { getDbClient, DatabaseError } from './client';
import type { OAuthStateRow } from './types';

export async function createOAuthState(params: {
  state: string;
  code_verifier: string;
  expires_at: string;
}): Promise<void> {
  const db = getDbClient();
  const { error } = await db.from('oauth_states').insert(params);
  if (error) throw new DatabaseError(error.message);
}

export async function consumeOAuthState(state: string): Promise<OAuthStateRow | null> {
  const db = getDbClient();
  // Fetch the state
  const { data, error } = await db
    .from('oauth_states')
    .select('*')
    .eq('state', state)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new DatabaseError(error.message);
  }

  // Delete it (one-time use)
  await db.from('oauth_states').delete().eq('state', state);

  return data as OAuthStateRow;
}

// Clean up expired states (call periodically)
export async function pruneExpiredStates(): Promise<void> {
  const db = getDbClient();
  await db.from('oauth_states').delete().lt('expires_at', new Date().toISOString());
}
