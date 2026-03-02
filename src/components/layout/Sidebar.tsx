'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '@/components/providers/SessionProvider';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/compose', label: 'Compose', icon: '✏️' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useSession();

  return (
    <aside className="fixed left-0 top-0 h-full w-[240px] bg-white border-r border-gray-100 flex flex-col z-30 hidden md:flex">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-100">
        <div className="w-8 h-8 bg-reddit-orange rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">R</span>
        </div>
        <span className="font-bold text-gray-900">Auto-Post</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-orange-50 text-reddit-orange'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User info */}
      {user && (
        <div className="px-4 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">Connected as</p>
          <p className="text-sm font-medium text-gray-900">u/{user.redditUsername}</p>
        </div>
      )}
    </aside>
  );
}
