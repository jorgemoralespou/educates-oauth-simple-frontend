import { getSiteConfig } from "@/lib/config";
import { Header } from "@/components/Header";
import { PortalCard } from "@/components/PortalCard";

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portals.map((portal) => (
              <PortalCard
                key={portal.workshopName}
                title={portal.title}
                description={portal.description}
                workshopName={portal.workshopName}
                isAuthenticated={!!session}
                loginUrl={`/login?returnTo=${encodeURIComponent(`/portal?autoLaunch=${encodeURIComponent(portal.workshopName)}`)}`}
                autoLaunch={autoLaunchWorkshop === portal.workshopName}
              />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
