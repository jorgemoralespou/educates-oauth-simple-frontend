import Link from "next/link";
import Image from "next/image";

interface CourseCardProps {
  name: string;
  slug: string;
  description: string;
  image?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  workshopCount: number;
}

export function CourseCard({ name, slug, description, image, difficulty, workshopCount }: CourseCardProps) {
  return (
    <Link href={`/courses/${encodeURIComponent(slug)}`} className="block">
      <div
        className="rounded-lg border shadow-sm overflow-hidden flex flex-col h-full transition-shadow hover:shadow-md"
        style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
      >
        <div className="relative w-full h-44 bg-gray-100 flex items-center justify-center overflow-hidden">
          {image ? (
            <Image src={image} alt={name} fill className="object-cover" />
          ) : (
            <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          )}
        </div>
        <div className="p-5 flex flex-col flex-grow">
          <div className="flex items-center gap-2 mb-2">
            {difficulty && (
              <span className={`badge badge-${difficulty}`}>{difficulty}</span>
            )}
          </div>
          <h2 className="text-lg font-semibold mb-1">{name}</h2>
          <p className="text-sm mb-4 flex-grow" style={{ color: "var(--text-secondary)" }}>
            {description}
          </p>
          <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
            <span>{workshopCount} {workshopCount === 1 ? "Workshop" : "Workshops"}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
