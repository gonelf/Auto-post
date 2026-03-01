export interface UserRow {
  id: string;
  reddit_user_id: string;
  reddit_username: string;
  access_token: string; // AES-256-GCM encrypted
  refresh_token: string; // AES-256-GCM encrypted
  token_expires_at: string; // ISO-8601 UTC
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostRow {
  id: string;
  user_id: string;
  post_type: 'text' | 'link' | 'image';
  title: string;
  subreddit: string;
  body_text: string | null;
  link_url: string | null;
  image_url: string | null;
  image_storage_key: string | null;
  status: 'draft' | 'scheduled' | 'posting' | 'posted' | 'failed';
  scheduled_at: string | null;
  posted_at: string | null;
  reddit_post_id: string | null;
  reddit_post_url: string | null;
  failure_reason: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface OAuthStateRow {
  id: string;
  state: string;
  code_verifier: string;
  expires_at: string;
  created_at: string;
}

export interface PostFilters {
  status?: PostRow['status'];
  page?: number;
  limit?: number;
}
