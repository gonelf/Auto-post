export interface RedditTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface RedditMeResponse {
  id: string;
  name: string;
  icon_img: string;
  snoovatar_img?: string;
}

export interface RedditSubredditData {
  display_name: string;
  title: string;
  subscribers: number;
  over18: boolean;
  allow_images: boolean;
  allow_link_posts: boolean;
  allow_videogifs: boolean;
  submission_type: string; // 'any' | 'self' | 'link'
  community_icon: string;
}

export interface RedditSubmitResponse {
  json: {
    errors: Array<[string, string, string]>;
    data?: {
      url: string;
      drafts_count: number;
      id: string;
      name: string; // t3_xxxxxx
    };
  };
}

export interface RedditMediaAssetResponse {
  asset: {
    asset_id: string;
    processing_state: string;
    payload: {
      filepath: string;
    };
    websocket_url: string;
  };
  upload_lease: {
    action: string;
    fields: Array<{ name: string; value: string }>;
  };
}

export interface RedditApiError {
  message: string;
  error: number;
}
