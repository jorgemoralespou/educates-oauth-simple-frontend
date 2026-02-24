import { auth } from "@/lib/auth";
import { getSiteConfig } from "@/lib/config";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  // Validate credentials against static users in site.json
  const site = getSiteConfig();
  const users = site.authProviders.static || [];
  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  // Ensure user exists in Better Auth DB for session management.
  // signUpEmail creates the user if not exists; ignore error if already exists.
  await auth.api
    .signUpEmail({
      body: {
        email: user.email,
        password: password,
        name: user.name || user.email,
      },
    })
    .catch(() => null);

  // Sign in to create a session
  const signInResponse = await auth.api.signInEmail({
    body: { email: user.email, password },
    asResponse: true,
  });

  // Forward the response (includes Set-Cookie headers for the session)
  const responseBody = await signInResponse.text();
  return new NextResponse(responseBody, {
    status: signInResponse.status,
    headers: signInResponse.headers,
  });
}
