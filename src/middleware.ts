import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

const authBeforeCatalog = process.env.AUTH_BEFORE_CATALOG !== "false";

export async function middleware(request: NextRequest) {
  if (!authBeforeCatalog) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/portal"],
};
