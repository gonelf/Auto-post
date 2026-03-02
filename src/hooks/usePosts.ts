import useSWR from 'swr';
import type { PostRow } from '@/lib/db/types';

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

interface PostsResponse {
  posts: PostRow[];
  total: number;
  stats: { total: number; scheduled: number; posted: number; failed: number };
  page: number;
  limit: number;
}

export function usePosts(params: { status?: string; page?: number; limit?: number } = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));

  const { data, error, isLoading, mutate } = useSWR<PostsResponse>(
    `/api/posts?${query}`,
    fetcher,
    { refreshInterval: 30_000 } // auto-refresh every 30s to catch status updates
  );

  return {
    posts: data?.posts || [],
    total: data?.total || 0,
    stats: data?.stats || { total: 0, scheduled: 0, posted: 0, failed: 0 },
    loading: isLoading,
    error,
    mutate,
  };
}
