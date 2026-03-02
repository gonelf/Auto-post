'use client';

import { useState, useRef, useEffect } from 'react';
import { useSubredditSearch } from '@/hooks/useSubredditSearch';
import { cn } from '@/lib/utils';
import type { SubredditResult } from '@/lib/reddit/subreddits';

interface SubredditSearchProps {
  value: string;
  onChange: (subreddit: string) => void;
  onSelect?: (info: SubredditResult) => void;
  error?: string;
}

export function SubredditSearch({ value, onChange, onSelect, error }: SubredditSearchProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const { results, loading } = useSubredditSearch(query);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleSelect(sr: SubredditResult) {
    setQuery(sr.name);
    onChange(sr.name);
    onSelect?.(sr);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">r/</span>
        <input
          type="text"
          placeholder="search subreddits..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className={cn(
            'w-full rounded-lg border pl-8 pr-3 py-2 text-sm outline-none transition-colors',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
              : 'border-gray-200 focus:border-reddit-orange focus:ring-1 focus:ring-reddit-orange'
          )}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </span>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {open && results.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-lg shadow-lg max-h-60 overflow-auto">
          {results.map((sr) => (
            <li
              key={sr.name}
              onClick={() => handleSelect(sr)}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
            >
              <div>
                <span className="text-sm font-medium text-gray-900">r/{sr.name}</span>
                {sr.nsfw && (
                  <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">NSFW</span>
                )}
                <p className="text-xs text-gray-400 truncate max-w-[200px]">{sr.title}</p>
              </div>
              <span className="text-xs text-gray-400 ml-4">
                {sr.subscribers >= 1000
                  ? `${(sr.subscribers / 1000).toFixed(0)}k`
                  : sr.subscribers}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
