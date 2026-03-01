import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { ToastContainer } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'Reddit Auto-Post',
  description: 'Schedule and auto-post to Reddit',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          {children}
          <ToastContainer />
        </SessionProvider>
      </body>
    </html>
  );
}
