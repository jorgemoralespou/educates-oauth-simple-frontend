import { auth } from "@/lib/auth";
import { getSiteConfig } from "@/lib/config";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { requestWorkshopSession } from "@/lib/educates";
import { generateVoucherUrl } from "@/lib/session-bouncer";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const site = getSiteConfig();
  const { name: workshopName } = await params;
  const returnPath = request.nextUrl.searchParams.get("returnPath") || "/portal";
  const clientIndexUrl = `${site.homeUrl.replace(/\/+$/, "")}${returnPath}`;

  let userEmail = "";
  let userName = "";

  if (site.requireAuth) {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userEmail = session.user.email;
    userName = session.user.name;
  }

  try {
    if (site.backend === "session-bouncer") {
      const sessionActivationUrl = generateVoucherUrl(
        workshopName,
        userEmail,
        userName,
        clientIndexUrl
      );

      return NextResponse.json({ sessionActivationUrl });
    }

    const result = await requestWorkshopSession(
      workshopName,
      userEmail,
      clientIndexUrl
    );

    return NextResponse.json({
      sessionActivationUrl: result.sessionActivationUrl,
    });
  } catch (error) {
    console.error("Workshop session request failed:", error);
    return NextResponse.json(
      { error: "Failed to start workshop session" },
      { status: 502 }
    );
  }
}
