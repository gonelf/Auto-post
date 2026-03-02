import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { uploadImage, validateImageFile, StorageError } from '@/lib/upload/storage';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  try {
    validateImageFile(file);
    const result = await uploadImage(file, session.user.userId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof StorageError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
