import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { nextUrl } = request;
  const sessionToken = request.cookies.get("better-auth.session_token") || request.cookies.get("__Secure-better-auth.session_token");
  const isLoggedIn = !!sessionToken;

  const isOnLogin = nextUrl.pathname.startsWith('/login');
  const isApi = nextUrl.pathname.startsWith('/api');
  const isNext = nextUrl.pathname.startsWith('/_next');
  const isPublic = isApi || isNext || nextUrl.pathname === '/favicon.ico';

  if (isPublic) {
    return NextResponse.next();
  }

  if (isOnLogin) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/', nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
