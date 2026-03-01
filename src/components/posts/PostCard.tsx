'use client';

import { useState } from 'react';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toast';
import { formatDatetime } from '@/lib/utils';
import type { PostRow } from '@/lib/db/types';

const POST_TYPE_ICON: Record<string, string> = {
  text: '📝',
  link: '🔗',
  image: '🖼️',
};

interface PostCardProps {
  post: PostRow;
  onDelete: (id: string) => void;
}

export function PostCard({ post, onDelete }: PostCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      onDelete(post.id);
      showToast('Post deleted', 'success');
    } catch {
      showToast('Failed to delete post', 'error');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <tr className="hover:bg-gray-50 border-b border-gray-100">
        <td className="px-4 py-3">
          <button
            onClick={() => setDetailOpen(true)}
            className="text-sm font-medium text-gray-900 hover:text-reddit-orange text-left line-clamp-1 max-w-xs"
          >
            {post.title}
          </button>
        </td>
        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
          {POST_TYPE_ICON[post.post_type]} {post.post_type}
        </td>
        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
          r/{post.subreddit}
        </td>
        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
          {post.scheduled_at ? formatDatetime(post.scheduled_at) : '—'}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <StatusBadge status={post.status} />
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-2">
            {post.reddit_post_url && (
              <a
                href={post.reddit_post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                View
              </a>
            )}
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Delete
            </button>
          </div>
        </td>
      </tr>

      {/* Detail modal */}
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={post.title}>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-center gap-3">
            <StatusBadge status={post.status} />
            <span>{POST_TYPE_ICON[post.post_type]} {post.post_type} post</span>
            <span>r/{post.subreddit}</span>
          </div>
          {post.body_text && (
            <div className="bg-gray-50 rounded-lg p-3 whitespace-pre-wrap text-xs font-mono">
              {post.body_text}
            </div>
          )}
          {post.link_url && (
            <a href={post.link_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
              {post.link_url}
            </a>
          )}
          {post.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.image_url} alt="Post image" className="rounded-lg max-h-48 object-cover" />
          )}
          {post.failure_reason && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-red-700 text-xs">
              <strong>Error:</strong> {post.failure_reason}
              {post.retry_count > 0 && ` (attempt ${post.retry_count}/3)`}
            </div>
          )}
          {post.reddit_post_url && (
            <a
              href={post.reddit_post_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-reddit-orange text-white text-xs px-3 py-1.5 rounded-full hover:bg-reddit-orange-dark"
            >
              View on Reddit →
            </a>
          )}
        </div>
      </Modal>

      {/* Confirm delete modal */}
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete Post">
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to delete &quot;{post.title}&quot;? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" loading={deleting} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
