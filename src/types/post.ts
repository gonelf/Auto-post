export type PostType = 'text' | 'link' | 'image';

export type PostStatus = 'draft' | 'scheduled' | 'posting' | 'posted' | 'failed';

export interface PostCreatePayload {
  post_type: PostType;
  title: string;
  subreddit: string;
  body_text?: string;
  link_url?: string;
  image_url?: string;
  image_storage_key?: string;
  scheduled_at?: string; // ISO-8601 UTC; omit or set to now for immediate
}

export interface PostUpdatePayload extends Partial<PostCreatePayload> {}
