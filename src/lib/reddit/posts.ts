import { redditFetch } from './client';
import type { PostRow } from '@/lib/db/types';
import type { RedditSubmitResponse, RedditMediaAssetResponse } from '@/types/reddit';

export interface SubmitResult {
  postId: string;
  postUrl: string;
}

/**
 * Submit a post to Reddit.
 * Handles text, link, and image post types.
 */
export async function submitPost(post: PostRow, accessToken: string): Promise<SubmitResult> {
  if (post.post_type === 'image') {
    return submitImagePost(post, accessToken);
  }

  const body = new URLSearchParams({
    sr: post.subreddit,
    title: post.title,
    api_type: 'json',
    resubmit: 'true',
    nsfw: 'false',
    spoiler: 'false',
  });

  if (post.post_type === 'text') {
    body.set('kind', 'self');
    body.set('text', post.body_text || '');
  } else if (post.post_type === 'link') {
    body.set('kind', 'link');
    body.set('url', post.link_url || '');
  }

  const result = await redditFetch<RedditSubmitResponse>(
    '/api/submit',
    accessToken,
    { method: 'POST', body: body.toString() }
  );

  if (!result.json?.data) {
    throw new Error('Reddit submit returned no data');
  }

  return {
    postId: result.json.data.name,
    postUrl: result.json.data.url,
  };
}

/**
 * Submit an image post using Reddit's asset upload flow.
 * Step 1: Request upload lease from Reddit
 * Step 2: Upload image to Reddit's S3
 * Step 3: Submit post with the asset URL
 */
async function submitImagePost(post: PostRow, accessToken: string): Promise<SubmitResult> {
  if (!post.image_url) {
    throw new Error('Image post has no image_url');
  }

  // Fetch the image from our storage
  const imageResponse = await fetch(post.image_url);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image from storage: ${imageResponse.status}`);
  }
  const imageBuffer = await imageResponse.arrayBuffer();
  const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
  const filename = `post-${post.id}.${contentType.split('/')[1] || 'jpg'}`;

  // Step 1: Get Reddit media upload lease
  const leaseBody = new URLSearchParams({
    filepath: filename,
    mimetype: contentType,
  });

  const leaseData = await redditFetch<RedditMediaAssetResponse>(
    '/api/media/asset.json',
    accessToken,
    { method: 'POST', body: leaseBody.toString() }
  );

  // Step 2: Upload to Reddit's S3
  const uploadUrl = `https:${leaseData.upload_lease.action}`;
  const formData = new FormData();
  for (const field of leaseData.upload_lease.fields) {
    formData.append(field.name, field.value);
  }
  formData.append('file', new Blob([imageBuffer], { type: contentType }), filename);

  const uploadResponse = await fetch(uploadUrl, { method: 'POST', body: formData });
  if (!uploadResponse.ok) {
    throw new Error(`Reddit S3 upload failed: ${uploadResponse.status}`);
  }

  // Step 3: Submit the image post
  const assetUrl = `https://i.redd.it/${leaseData.asset.asset_id}`;
  const submitBody = new URLSearchParams({
    sr: post.subreddit,
    title: post.title,
    kind: 'image',
    url: assetUrl,
    api_type: 'json',
    resubmit: 'true',
    nsfw: 'false',
    spoiler: 'false',
  });

  const result = await redditFetch<RedditSubmitResponse>(
    '/api/submit',
    accessToken,
    { method: 'POST', body: submitBody.toString() }
  );

  if (!result.json?.data) {
    throw new Error('Reddit image submit returned no data');
  }

  return {
    postId: result.json.data.name,
    postUrl: result.json.data.url,
  };
}
