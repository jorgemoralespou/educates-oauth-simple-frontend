import { getSiteConfig } from "@/lib/config";
import { Header } from "@/components/Header";
import { PortalGrid } from "@/components/PortalGrid";

interface PortalViewProps {
  session: { user: { name: string; email: string } } | null;
  autoLaunchWorkshop?: string;
}

export function PortalView({ session, autoLaunchWorkshop }: PortalViewProps) {
  const site = getSiteConfig();
  const portals = site.portals;
  const homeHref = site.authBeforeCatalog ? "/portal" : "/";

  return (
    <>
      <Header userName={session?.user.name} homeHref={homeHref} siteTitle={site.title} />
      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          <PortalGrid
            portals={portals}
            isAuthenticated={!!session}
            autoLaunchWorkshop={autoLaunchWorkshop}
            support={site.support}
          />
        </div>
      </main>
    </>
  );
}
