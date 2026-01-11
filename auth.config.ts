import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: '/login',
  },
  providers: [
    // Providers added in auth.ts (server-side) to avoid edge issues with some libs if needed,
    // though GitHub/Google are usually fine. But for now keep empty here to break circular deps.
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith('/login');
      
      // Allow access to public assets and api
      if (nextUrl.pathname.startsWith('/api') || nextUrl.pathname.startsWith('/_next')) {
          return true;
      }

      if (isOnLogin) {
        if (isLoggedIn) return Response.redirect(new URL('/', nextUrl));
        return true;
      }

      // Protect all other routes
      if (!isLoggedIn) {
          return false; // Redirect to login
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
