import { auth } from "@/lib/auth";
import { getSiteConfig } from "@/lib/config";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { requestWorkshopSession } from "@/lib/educates";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name: workshopName } = await params;
  const { homeUrl } = getSiteConfig();
  const clientIndexUrl = `${homeUrl.replace(/\/+$/, "")}/portal`;

  try {
    const result = await requestWorkshopSession(
      workshopName,
      session.user.email,
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
