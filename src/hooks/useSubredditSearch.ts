import { useState, useEffect, useRef } from 'react';
import type { SubredditResult } from '@/lib/reddit/subreddits';

export function useSubredditSearch(query: string) {
  const [results, setResults] = useState<SubredditResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/subreddits?q=${encodeURIComponent(query)}&limit=8`);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setResults(data.subreddits || []);
      } catch {
        setError('Failed to search subreddits');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return { results, loading, error };
}
