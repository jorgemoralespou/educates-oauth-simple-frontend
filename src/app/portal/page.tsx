import { auth } from "@/lib/auth";
import { getSiteConfig } from "@/lib/config";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PortalView } from "@/components/PortalView";

interface PortalPageProps {
  searchParams: Promise<{ autoLaunch?: string }>;
}

export default async function PortalPage({ searchParams }: PortalPageProps) {
  const site = getSiteConfig();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (site.authBeforeCatalog && !session) {
    redirect("/");
  }

  const { autoLaunch } = await searchParams;
  return <PortalView session={session} autoLaunchWorkshop={autoLaunch} />;
}
