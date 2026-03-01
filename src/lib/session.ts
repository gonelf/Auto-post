import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';
import type { AppSession } from '@/types/session';

const sessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: 'reddit_autopost_session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function getSession(): Promise<IronSession<AppSession>> {
  const cookieStore = await cookies();
  return getIronSession<AppSession>(cookieStore, sessionOptions);
}

export async function requireSession(): Promise<NonNullable<AppSession['user']>> {
  const session = await getSession();
  if (!session.user) {
    throw new Error('Unauthorized');
  }
  return session.user;
}
