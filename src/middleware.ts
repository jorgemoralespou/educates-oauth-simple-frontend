import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const requireAuth = process.env.REQUIRE_AUTH !== "false";
  const showCatalogUnauthenticated = process.env.SHOW_CATALOG_UNAUTHENTICATED === "true";

  if (!requireAuth) {
    return NextResponse.next();
  }

  if (showCatalogUnauthenticated) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/portal", "/courses", "/courses/:path*"],
};
