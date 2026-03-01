/**
 * Image storage abstraction using Tacobase/Supabase Storage.
 * Swap getStorageClient() to use a different provider.
 */

import { createClient } from '@supabase/supabase-js';

function getStorageClient() {
  const url = process.env.TACOBASE_URL!;
  const key = process.env.TACOBASE_SERVICE_ROLE_KEY!;
  return createClient(url, key).storage;
}

const BUCKET = process.env.STORAGE_BUCKET_NAME || 'post-images';
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export interface UploadResult {
  url: string;
  key: string;
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

export async function uploadImage(
  file: File,
  userId: string
): Promise<UploadResult> {
  const ext = file.type.split('/')[1] || 'jpg';
  const key = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const storage = getStorageClient();
  const arrayBuffer = await file.arrayBuffer();
  const { error } = await storage.from(BUCKET).upload(key, arrayBuffer, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new StorageError(`Upload failed: ${error.message}`);
  }

  const { data } = storage.from(BUCKET).getPublicUrl(key);
  return { url: data.publicUrl, key };
}

export async function deleteImage(key: string): Promise<void> {
  const storage = getStorageClient();
  const { error } = await storage.from(BUCKET).remove([key]);
  if (error) {
    console.error(`Failed to delete image ${key}:`, error.message);
  }
}
