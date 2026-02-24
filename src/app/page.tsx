import { auth, enabledSocialProviders, hasStaticUsers } from "@/lib/auth";
import { getSiteConfig } from "@/lib/config";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { LoginButtons } from "@/components/LoginButtons";
import { PortalView } from "@/components/PortalView";

interface RootPageProps {
  searchParams: Promise<{ autoLaunch?: string }>;
}

export default async function RootPage({ searchParams }: RootPageProps) {
  const site = getSiteConfig();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (site.authBeforeCatalog) {
    if (session) {
      redirect("/portal");
    }

    return (
      <>
        <Header siteTitle={site.title} />
        <main className="flex items-center justify-center min-h-[calc(100vh-56px)]">
          <div className="rounded-lg shadow-md p-8 max-w-md w-full mx-4" style={{ backgroundColor: 'var(--card-bg)' }}>
            <h1 className="text-2xl font-bold text-center mb-6">
              Login
            </h1>
            <LoginButtons enabledProviders={enabledSocialProviders} hasStaticUsers={hasStaticUsers} />
          </div>
        </main>
      </>
    );
  }

  const { autoLaunch } = await searchParams;
  return <PortalView session={session} autoLaunchWorkshop={autoLaunch} />;
}
