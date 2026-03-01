/**
 * Swappable database client factory.
 *
 * All database access goes through this module. To switch from
 * Tacobase to another provider, only update this file.
 * Repository functions in posts.ts, users.ts, etc. remain unchanged.
 *
 * Tacobase API:
 *   client.collection<T>('name').getList(page, perPage, { filter, sort })
 *   client.collection<T>('name').getOne(id)
 *   client.collection<T>('name').getFirstListItem(filter)
 *   client.collection<T>('name').getFullList({ filter, sort, fields })
 *   client.collection<T>('name').create(data | FormData)
 *   client.collection<T>('name').update(id, data | FormData)
 *   client.collection<T>('name').delete(id)
 *
 * Filter syntax: 'field = "value"', 'a && b', 'a || b', '>=', '<=', '~', '?~'
 * Sort syntax:   'field' (asc), '-field' (desc)
 * Timestamps:    'created', 'updated' (auto-managed by Tacobase)
 */
import { createClient, RecordNotFoundError } from '@tacobase/client';

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export function getDbClient() {
  const url = process.env.TACOBASE_URL;
  const key = process.env.TACOBASE_API_KEY;

  if (!url || !key) {
    throw new DatabaseError(
      'Missing TACOBASE_URL or TACOBASE_API_KEY environment variables'
    );
  }

  return createClient(url, key);
}

/** Wrap a Tacobase call and rethrow as DatabaseError */
export async function dbCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    if (isNotFound(err)) throw err; // preserve for callers
    const msg = err instanceof Error ? err.message : String(err);
    throw new DatabaseError(msg);
  }
}

/** Returns true if a Tacobase error means the record was not found (404). */
export function isNotFound(err: unknown): boolean {
  return err instanceof RecordNotFoundError;
}
