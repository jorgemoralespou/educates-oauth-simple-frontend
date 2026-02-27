import { existsSync, readFileSync, statSync } from "fs";
import { join } from "path";

export interface WorkshopItem {
  title: string;
  description: string;
  workshopName: string;
  image?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  duration?: string;
}

export type PortalItem = WorkshopItem;

export interface CourseItem {
  name: string;
  slug: string;
  image?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  description: string;
  workshops: WorkshopItem[];
}

export interface EducatesConfig {
  lookupServiceUrl: string;
  tenantName: string;
  credentials: {
    username: string;
    password: string;
  };
}

export interface StaticUser {
  email: string;
  password: string;
  name?: string;
}

export interface SiteConfig {
  title: string;
  description: string;
  homeUrl: string;
  authBeforeCatalog: boolean;
  betterAuth: {
    secret: string;
    baseURL: string;
  };
  authProviders: {
    static?: StaticUser[];
    microsoft?: {
      clientId: string;
      clientSecret: string;
      tenantId?: string;
    };
    github?: {
      clientId: string;
      clientSecret: string;
    };
    google?: {
      clientId: string;
      clientSecret: string;
    };
  };
  logoUrl?: string;
  portals?: PortalItem[];
  courses?: CourseItem[];
  educates: EducatesConfig;
}

const CONFIG_DIR = process.env.CONFIG_DIR || join(process.cwd(), "config");

let siteCache: SiteConfig | null = null;

export function getSiteConfig(): SiteConfig {
  if (!siteCache) {
    const raw = readFileSync(join(CONFIG_DIR, "site.json"), "utf-8");
    siteCache = JSON.parse(raw) as SiteConfig;
  }
  return siteCache;
}

export function getCourses(): CourseItem[] {
  const site = getSiteConfig();
  if (site.courses && site.courses.length > 0) {
    return site.courses;
  }
  if (site.portals && site.portals.length > 0) {
    return [
      {
        name: "Workshops",
        slug: "workshops",
        description: "Available workshops",
        workshops: site.portals,
      },
    ];
  }
  return [];
}

export function getCourseBySlug(slug: string): CourseItem | undefined {
  return getCourses().find((c) => c.slug === slug);
}

let themeCache: string | null | undefined = undefined;

export function getThemeCSS(): string | null {
  if (themeCache === undefined) {
    const themePath = join(CONFIG_DIR, "theme.css");
    try {
      themeCache = readFileSync(themePath, "utf-8");
      console.log(`[theme] Loaded custom theme from ${themePath} (${themeCache.length} bytes)`);
    } catch {
      themeCache = null;
      console.log(`[theme] No custom theme found at ${themePath}`);
    }
  }
  return themeCache;
}

const LOGO_EXTENSIONS = ["svg", "png", "jpg", "jpeg", "webp"];

let logoUrlCache: string | null | undefined = undefined;

export function getLogoUrl(): string | null {
  if (logoUrlCache === undefined) {
    const site = getSiteConfig();

    // Priority 1: logoUrl in site.json
    if (site.logoUrl) {
      logoUrlCache = site.logoUrl;
      console.log(`[logo] Using logoUrl from site.json: ${logoUrlCache}`);
      return logoUrlCache;
    }

    // Priority 2: logo file in config dir
    for (const ext of LOGO_EXTENSIONS) {
      const logoPath = join(CONFIG_DIR, `logo.${ext}`);
      if (existsSync(logoPath) && statSync(logoPath).isFile()) {
        logoUrlCache = `/api/logo`;
        console.log(`[logo] Found logo file at ${logoPath}, serving via ${logoUrlCache}`);
        return logoUrlCache;
      }
    }

    logoUrlCache = null;
    console.log(`[logo] No custom logo configured`);
  }
  return logoUrlCache;
}
