import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/session';
import { getPostById, updatePost, deletePost } from '@/lib/db/posts';

const PostUpdateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  subreddit: z.string().min(1).max(50).regex(/^[A-Za-z0-9_]+$/).optional(),
  body_text: z.string().max(40000).optional(),
  link_url: z.string().url().max(2048).optional(),
  image_url: z.string().url().optional(),
  image_storage_key: z.string().optional(),
  scheduled_at: z.string().datetime().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const post = await getPostById(id, session.user.userId);
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ post });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const post = await getPostById(id, session.user.userId);
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Reject edits if scheduled_at is within 60 seconds (may be processing)
  if (post.scheduled_at) {
    const scheduledTime = new Date(post.scheduled_at).getTime();
    if (scheduledTime - Date.now() < 60_000) {
      return NextResponse.json(
        { error: 'Cannot edit a post that is about to be posted' },
        { status: 409 }
      );
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = PostUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await updatePost(id, session.user.userId, parsed.data);
  if (!updated) {
    return NextResponse.json(
      { error: 'Cannot edit a post that has already been posted or is currently posting' },
      { status: 409 }
    );
  }

  return NextResponse.json({ post: updated });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const deleted = await deletePost(id, session.user.userId);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return new NextResponse(null, { status: 204 });
}
