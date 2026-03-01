'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TopBar } from '@/components/layout/TopBar';
import { PostCard } from '@/components/posts/PostCard';
import { Button } from '@/components/ui/Button';
import { usePosts } from '@/hooks/usePosts';
import type { PostStatus } from '@/types/post';

const STATUS_TABS: { label: string; value: PostStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Posted', value: 'posted' },
  { label: 'Failed', value: 'failed' },
];

export default function DashboardPage() {
  const [activeStatus, setActiveStatus] = useState<PostStatus | ''>('');
  const [page, setPage] = useState(1);

  const { posts, total, stats, loading, mutate } = usePosts({
    status: activeStatus || undefined,
    page,
    limit: 20,
  });

  function handleDelete(id: string) {
    mutate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        posts: prev.posts.filter((p) => p.id !== id),
        total: prev.total - 1,
      };
    });
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <>
      <TopBar title="Dashboard" />
      <main className="flex-1 p-6 pb-20 md:pb-6">
        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Posts', value: stats.total, color: 'text-gray-900' },
            { label: 'Scheduled', value: stats.scheduled, color: 'text-blue-600' },
            { label: 'Posted', value: stats.posted, color: 'text-green-600' },
            { label: 'Failed', value: stats.failed, color: 'text-red-600' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs + compose button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => { setActiveStatus(tab.value); setPage(1); }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeStatus === tab.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Link href="/compose">
            <Button size="sm">+ New Post</Button>
          </Link>
        </div>

        {/* Post table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <svg className="animate-spin h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-gray-500 mb-4">
                {activeStatus ? `No ${activeStatus} posts` : 'No posts yet'}
              </p>
              <Link href="/compose">
                <Button size="sm">Create your first post</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Title', 'Type', 'Subreddit', 'Scheduled', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} onDelete={handleDelete} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages} ({total} posts)
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
