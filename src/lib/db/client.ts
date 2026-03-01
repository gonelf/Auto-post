/**
 * Swappable database client factory.
 *
 * All database access goes through this module. To switch from
 * Tacobase/Supabase to another provider, only update this file.
 * Repository functions in posts.ts, users.ts, etc. remain unchanged.
 */
import { createClient } from '@supabase/supabase-js';

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export function getDbClient() {
  const url = process.env.TACOBASE_URL;
  const key = process.env.TACOBASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new DatabaseError(
      'Missing TACOBASE_URL or TACOBASE_SERVICE_ROLE_KEY environment variables'
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
