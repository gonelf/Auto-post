import { Sidebar } from '@/components/layout/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      {/* Main content offset by sidebar on desktop */}
      <div className="md:ml-[240px] flex flex-col min-h-screen">
        {children}
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-30">
        {[
          { href: '/dashboard', icon: '📊', label: 'Dashboard' },
          { href: '/compose', icon: '✏️', label: 'Compose' },
          { href: '/settings', icon: '⚙️', label: 'Settings' },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center justify-center py-3 text-xs text-gray-600 hover:text-reddit-orange"
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
