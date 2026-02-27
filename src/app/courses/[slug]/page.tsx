import { auth } from "@/lib/auth";
import { getCourseBySlug, getSiteConfig } from "@/lib/config";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { WorkshopView } from "@/components/WorkshopView";

interface CourseDetailPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ autoLaunch?: string }>;
}

export default async function CourseDetailPage({ params, searchParams }: CourseDetailPageProps) {
  const site = getSiteConfig();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (site.authBeforeCatalog && !session) {
    redirect("/");
  }

  const { slug } = await params;
  const course = getCourseBySlug(slug);

  if (!course) {
    notFound();
  }

  const { autoLaunch } = await searchParams;

  return (
    <WorkshopView
      session={session}
      courseSlug={course.slug}
      courseName={course.name}
      courseDescription={course.description}
      workshops={course.workshops}
      autoLaunchWorkshop={autoLaunch}
    />
  );
}
