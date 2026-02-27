import { getCourses, getLogoUrl, getSiteConfig } from "@/lib/config";
import { Header } from "@/components/Header";
import { CourseCard } from "@/components/CourseCard";

interface CourseViewProps {
  session: { user: { name: string; email: string } } | null;
}

export function CourseView({ session }: CourseViewProps) {
  const site = getSiteConfig();
  const courses = getCourses();
  const homeHref = site.authBeforeCatalog ? "/courses" : "/";

  return (
    <>
      <Header userName={session?.user.name} homeHref={homeHref} siteTitle={site.title} logoUrl={getLogoUrl()} />
      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Courses</h1>
            <p style={{ color: "var(--text-secondary)" }}>{site.description}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map((course) => (
              <CourseCard
                key={course.slug}
                name={course.name}
                slug={course.slug}
                description={course.description}
                image={course.image}
                difficulty={course.difficulty}
                workshopCount={course.workshops.length}
              />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
