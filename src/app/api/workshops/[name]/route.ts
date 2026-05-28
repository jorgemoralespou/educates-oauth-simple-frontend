import { auth } from "@/lib/auth";
import { getSiteConfig } from "@/lib/config";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { LookupError, requestWorkshopSession } from "@/lib/educates";
import { randomBytes } from "crypto";

function newRequestId(): string {
  return randomBytes(3).toString("hex");
}

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
  const site = getSiteConfig();
  const clientIndexUrl = `${site.homeUrl.replace(/\/+$/, "")}/portal`;

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
    const requestId = newRequestId();

    if (error instanceof LookupError) {
      console.error(
        `[workshop-session] ref=${requestId} code=${error.code} workshop=${workshopName}: ${error.message}`,
      );
      const body: {
        error: { code: string; requestId: string; details?: string };
      } = {
        error: { code: error.code, requestId },
      };
      if (site.showDiagnostics) {
        body.error.details = error.message;
      }
      return NextResponse.json(body, { status: error.httpStatus });
    }

    console.error(
      `[workshop-session] ref=${requestId} code=LOOKUP_UNKNOWN workshop=${workshopName}:`,
      error,
    );
    const body: {
      error: { code: string; requestId: string; details?: string };
    } = {
      error: { code: "LOOKUP_UNKNOWN", requestId },
    };
    if (site.showDiagnostics) {
      body.error.details = error instanceof Error ? error.message : String(error);
    }
    return NextResponse.json(body, { status: 500 });
  }
}
