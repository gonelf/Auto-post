import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/session';
import { getPostsByUser, createPost, getPostStats } from '@/lib/db/posts';

const PostCreateSchema = z.object({
  post_type: z.enum(['text', 'link', 'image']),
  title: z.string().min(1).max(300),
  subreddit: z.string().min(1).max(50).regex(/^[A-Za-z0-9_]+$/, 'Invalid subreddit name'),
  body_text: z.string().max(40000).optional(),
  link_url: z.string().url().max(2048).optional(),
  image_url: z.string().url().optional(),
  image_storage_key: z.string().optional(),
  scheduled_at: z.string().datetime().optional(),
}).refine((data) => {
  if (data.post_type === 'text') return true; // body_text is optional for text posts
  if (data.post_type === 'link') return !!data.link_url;
  if (data.post_type === 'image') return !!data.image_url;
  return false;
}, { message: 'Missing required field for post type' });

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as 'draft' | 'scheduled' | 'posting' | 'posted' | 'failed' | null;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

  const [{ posts, total }, stats] = await Promise.all([
    getPostsByUser(session.user.userId, { status: status || undefined, page, limit }),
    getPostStats(session.user.userId),
  ]);

  return NextResponse.json({ posts, total, stats, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = PostCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const post = await createPost(session.user.userId, parsed.data);
  return NextResponse.json({ post }, { status: 201 });
}
