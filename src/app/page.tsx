import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-reddit-orange rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <span className="font-bold text-lg">Reddit Auto-Post</span>
        </div>
        <Link
          href="/api/auth/login"
          className="bg-reddit-orange hover:bg-reddit-orange-dark text-white font-semibold px-5 py-2 rounded-full transition-colors"
        >
          Sign in with Reddit
        </Link>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4 leading-tight">
          Schedule Reddit Posts<br />on autopilot
        </h1>
        <p className="text-xl text-gray-500 mb-8 max-w-xl">
          Write your posts, pick a time, and let us handle the rest. Supports text, links, and images.
        </p>
        <Link
          href="/api/auth/login"
          className="bg-reddit-orange hover:bg-reddit-orange-dark text-white font-bold px-8 py-3 rounded-full text-lg transition-colors"
        >
          Get started — it&apos;s free
        </Link>

        {/* Feature cards */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full text-left">
          {[
            {
              icon: '📝',
              title: 'Text, Link & Image posts',
              desc: 'All Reddit post types supported. Rich text editor included.',
            },
            {
              icon: '🕐',
              title: 'Schedule for later',
              desc: 'Pick any date, time, and timezone. Posts go out automatically.',
            },
            {
              icon: '📊',
              title: 'Track your history',
              desc: 'Dashboard shows every post, its status, and direct Reddit links.',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-gray-50 rounded-2xl p-6 border border-gray-100"
            >
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
              <p className="text-gray-500 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-sm text-gray-400 border-t border-gray-100">
        By using this app you agree to{' '}
        <a
          href="https://www.reddit.com/wiki/api-terms"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-600"
        >
          Reddit&apos;s API Terms
        </a>
        .
      </footer>
    </div>
  );
}
