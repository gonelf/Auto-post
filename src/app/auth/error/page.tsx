'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'You cancelled the Reddit login. Please try again.',
  state_mismatch: 'Security check failed (state mismatch). Please try again.',
  token_exchange_failed: 'Failed to authenticate with Reddit. Please try again.',
  missing_params: 'Invalid OAuth response. Please try again.',
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'unknown';
  const message = ERROR_MESSAGES[error] || 'An unexpected error occurred during authentication.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Failed</h1>
        <p className="text-gray-500 mb-6">{message}</p>
        <Link
          href="/api/auth/login"
          className="bg-reddit-orange hover:bg-reddit-orange-dark text-white font-semibold px-6 py-2.5 rounded-full transition-colors inline-block"
        >
          Try Again
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={null}>
      <ErrorContent />
    </Suspense>
  );
}
