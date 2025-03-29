import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname, search } = request.nextUrl;
  const secFetchDest = request.headers.get("sec-fetch-dest");

  if (pathname === "/api/issues" && secFetchDest === "document") {
    const targetUrl = new URL("/", request.url);
    targetUrl.search = search;
    console.log(
      `Middleware: Redirecting direct API access ${request.nextUrl.toString()} to ${targetUrl.toString()}`
    );
    return NextResponse.redirect(targetUrl);
  }
  if (!pathname.startsWith("/_next/") && !pathname.startsWith("/api/")) {
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
