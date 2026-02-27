import { getSiteConfig, getLogoUrl } from "@/lib/config";
import { Header } from "@/components/Header";
import { WorkshopCard } from "@/components/WorkshopCard";
import type { WorkshopItem } from "@/lib/config";
import Link from "next/link";

interface WorkshopViewProps {
  session: { user: { name: string; email: string } } | null;
  courseSlug: string;
  courseName: string;
  courseDescription: string;
  workshops: WorkshopItem[];
  autoLaunchWorkshop?: string;
}

export function WorkshopView({ session, courseSlug, courseName, courseDescription, workshops, autoLaunchWorkshop }: WorkshopViewProps) {
  const site = getSiteConfig();
  const homeHref = site.authBeforeCatalog ? "/courses" : "/";

  return (
    <>
      <Header userName={session?.user.name} homeHref={homeHref} siteTitle={site.title} logoUrl={getLogoUrl()} />
      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-2">
            <Link href={homeHref} className="text-sm hover:underline" style={{ color: "var(--primary)" }}>
              &larr; Back to courses
            </Link>
          </div>
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">{courseName}</h1>
            <p style={{ color: "var(--text-secondary)" }}>{courseDescription}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workshops.map((workshop) => (
              <WorkshopCard
                key={workshop.workshopName}
                title={workshop.title}
                description={workshop.description}
                workshopName={workshop.workshopName}
                image={workshop.image}
                difficulty={workshop.difficulty}
                duration={workshop.duration}
                isAuthenticated={!!session}
                loginUrl={`/login?returnTo=${encodeURIComponent(`/courses/${encodeURIComponent(courseSlug)}?autoLaunch=${encodeURIComponent(workshop.workshopName)}`)}`}
                autoLaunch={autoLaunchWorkshop === workshop.workshopName}
                returnPath={`/courses/${encodeURIComponent(courseSlug)}`}
              />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
