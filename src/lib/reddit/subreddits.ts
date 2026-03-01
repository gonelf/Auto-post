import { redditFetch } from './client';
import type { RedditSubredditData } from '@/types/reddit';

export interface SubredditResult {
  name: string;
  title: string;
  subscribers: number;
  nsfw: boolean;
  allow_images: boolean;
  allow_link_posts: boolean;
  allow_self_posts: boolean;
  icon_url: string;
}

export async function searchSubreddits(
  query: string,
  accessToken: string,
  limit = 10
): Promise<SubredditResult[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    include_over_18: 'true',
    typeahead_active: 'true',
  });

  const data = await redditFetch<{ subreddits: RedditSubredditData[] }>(
    `/subreddits/search.json?${params}`,
    accessToken
  );

  // The endpoint returns data.subreddits for typeahead
  // Fallback to listing children if different format
  const subreddits: RedditSubredditData[] = Array.isArray(data?.subreddits)
    ? data.subreddits
    : [];

  return subreddits.map((sr) => ({
    name: sr.display_name,
    title: sr.title,
    subscribers: sr.subscribers,
    nsfw: sr.over18,
    allow_images: sr.allow_images !== false,
    allow_link_posts: sr.submission_type !== 'self',
    allow_self_posts: sr.submission_type !== 'link',
    icon_url: sr.community_icon || '',
  }));
}

export async function getSubredditInfo(
  subreddit: string,
  accessToken: string
): Promise<SubredditResult | null> {
  try {
    const data = await redditFetch<{ data: RedditSubredditData }>(
      `/r/${subreddit}/about.json`,
      accessToken
    );
    const sr = data.data;
    return {
      name: sr.display_name,
      title: sr.title,
      subscribers: sr.subscribers,
      nsfw: sr.over18,
      allow_images: sr.allow_images !== false,
      allow_link_posts: sr.submission_type !== 'self',
      allow_self_posts: sr.submission_type !== 'link',
      icon_url: sr.community_icon || '',
    };
  } catch {
    return null;
  }
}
