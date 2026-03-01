'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useSession } from '@/components/providers/SessionProvider';
import { showToast } from '@/components/ui/Toast';

export default function SettingsPage() {
  const { user, refresh } = useSession();
  const router = useRouter();
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      await refresh();
      router.push('/');
      showToast('Account disconnected', 'success');
    } catch {
      showToast('Failed to disconnect account', 'error');
    } finally {
      setDisconnecting(false);
      setDisconnectOpen(false);
    }
  }

  return (
    <>
      <TopBar title="Settings" />
      <main className="flex-1 p-6 pb-20 md:pb-6">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Reddit Account card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Reddit Account</h2>
            {user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-reddit-orange rounded-full flex items-center justify-center text-white font-bold">
                    {user.redditUsername[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">u/{user.redditUsername}</p>
                    <p className="text-xs text-gray-400">Connected</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Granted OAuth scopes</p>
                  <div className="flex flex-wrap gap-2">
                    {['identity', 'submit', 'read'].map((scope) => (
                      <span key={scope} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="pt-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDisconnectOpen(true)}
                  >
                    Disconnect Account
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No account connected.</p>
            )}
          </div>

          {/* How cron works */}
          <div className="bg-blue-50 rounded-2xl border border-blue-100 p-6">
            <h2 className="text-base font-semibold text-blue-900 mb-2">Scheduling Info</h2>
            <p className="text-sm text-blue-700 leading-relaxed">
              Scheduled posts are processed every minute by a cron job. Posts may be submitted
              up to ~60 seconds after their scheduled time. To set up the cron job, configure{' '}
              <strong>cron-job.org</strong> to call:
            </p>
            <code className="block mt-2 bg-blue-100 rounded-lg px-3 py-2 text-xs text-blue-800 break-all">
              GET {typeof window !== 'undefined' ? window.location.origin : ''}/api/cron<br />
              Authorization: Bearer {'<YOUR_CRON_SECRET>'}
            </code>
          </div>

        </div>
      </main>

      <Modal
        open={disconnectOpen}
        onClose={() => setDisconnectOpen(false)}
        title="Disconnect Reddit Account"
      >
        <p className="text-sm text-gray-600 mb-4">
          This will log you out and disconnect your Reddit account. Your scheduled posts will
          fail to post until you reconnect. This action cannot be undone from this app —
          you may also want to revoke access in your{' '}
          <a
            href="https://www.reddit.com/prefs/apps"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            Reddit app preferences
          </a>
          .
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={() => setDisconnectOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" loading={disconnecting} onClick={handleDisconnect}>
            Disconnect
          </Button>
        </div>
      </Modal>
    </>
  );
}
