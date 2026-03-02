import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import type { AppSession } from '@/types/session';

const sessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: 'reddit_autopost_session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  },
};

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getIronSession<AppSession>(request, response, sessionOptions);

  const isAuthenticated = !!session.user;
  const path = request.nextUrl.pathname;

  // Protected routes
  const protectedPaths = ['/dashboard', '/compose', '/settings'];
  const isProtected = protectedPaths.some((p) => path.startsWith(p));

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from landing page
  if (path === '/' && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/compose/:path*', '/settings/:path*'],
};
