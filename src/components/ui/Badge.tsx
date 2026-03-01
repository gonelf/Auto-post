import { cn } from '@/lib/utils';
import type { PostStatus } from '@/types/post';

const statusConfig: Record<PostStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
  scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-700' },
  posting: { label: 'Posting...', className: 'bg-yellow-100 text-yellow-700 animate-pulse' },
  posted: { label: 'Posted', className: 'bg-green-100 text-green-700' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-700' },
};

export function StatusBadge({ status, className }: { status: PostStatus; className?: string }) {
  const config = statusConfig[status] || statusConfig.draft;
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
