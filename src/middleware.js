import { NextResponse } from "next/server";

export function middleware(request) {
  if (
    request.nextUrl.pathname.startsWith("/_next/") ||
    request.nextUrl.pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' https://www.googletagmanager.com https://*.google-analytics.com 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https: https://*.google-analytics.com; " +
      "connect-src 'self' https://api.github.com https://*.google-analytics.com https://www.googletagmanager.com; " +
      "frame-ancestors 'none';"
  );

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
