/**
 * Image storage using Tacobase Storage.
 *
 * Tacobase stores files as fields on collection records.
 * We use a dedicated 'media' collection with a 'file' field.
 * The record ID serves as the deletion key.
 *
 * Required Tacobase setup:
 *   Create a collection named 'media' with fields:
 *     - file     (file type, max 20MB, accepts images)
 *     - user_id  (text)
 *
 * File URL format: /api/db/files/:collectionName/:recordId/:filename
 * Retrieved via: db.storage.getFileUrl(record, record.file)
 */
import { getDbClient, dbCall } from '../db/client';
import type { RecordModel } from '@tacobase/client';

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export interface UploadResult {
  url: string;
  key: string; // Tacobase media record ID — used for deletion
}

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

export function validateImageFile(file: File): void {
  if (file.size > MAX_SIZE_BYTES) {
    throw new StorageError(`File too large: ${Math.round(file.size / 1024 / 1024)}MB. Max 20MB.`);
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new StorageError(`Invalid file type: ${file.type}. Allowed: JPEG, PNG, GIF, WebP`);
  }
}

// Tacobase RecordModel extended with our media fields
type MediaRecord = RecordModel & {
  file: string;   // filename string as stored by Tacobase
  user_id: string;
};

export async function uploadImage(file: File, userId: string): Promise<UploadResult> {
  const db = getDbClient();

  // Tacobase file uploads use FormData on the collection create call
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user_id', userId);

  const record = await dbCall(() =>
    db.collection<MediaRecord>('media').create(formData)
  );

  // getFileUrl(record, filename) — 'filename' is the value stored in record.file
  const url = db.storage.getFileUrl(record, record.file);

  return { url, key: record.id };
}

export async function deleteImage(key: string): Promise<void> {
  const db = getDbClient();
  try {
    await dbCall(() => db.collection('media').delete(key));
  } catch (err) {
    // Non-fatal: log but don't throw (post may already be submitted)
    console.error(`Failed to delete media record ${key}:`, err);
  }
}
