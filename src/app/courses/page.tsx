import { auth } from "@/lib/auth";
import { getSiteConfig } from "@/lib/config";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CourseView } from "@/components/CourseView";

export default async function CoursesPage() {
  const site = getSiteConfig();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (site.authBeforeCatalog && !session) {
    redirect("/");
  }

  return <CourseView session={session} />;
}
