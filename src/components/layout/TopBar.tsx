'use client';

import { useRouter } from 'next/navigation';
import { useSession } from '@/components/providers/SessionProvider';
import { Button } from '@/components/ui/Button';
import { showToast } from '@/components/ui/Toast';

interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps) {
  const { user, refresh } = useSession();
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      await refresh();
      router.push('/');
    } catch {
      showToast('Logout failed. Please try again.', 'error');
    }
  }

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-white border-b border-gray-100 sticky top-0 z-20">
      <h1 className="text-base font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-3">
        {user && (
          <>
            <span className="text-sm text-gray-500 hidden sm:block">
              u/{user.redditUsername}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
