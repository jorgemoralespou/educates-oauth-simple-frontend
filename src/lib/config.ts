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

export interface LookupServiceConfig {
  lookupServiceUrl: string;
  tenantName: string;
  credentials: {
    username: string;
    password: string;
  };
}

export interface SessionBouncerConfig {
  bouncerUrl: string;
  issuer: string;
  voucherSigningKey?: string;
  trustedVoucher?: boolean;
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
  backend: "lookup-service" | "session-bouncer";
  requireAuth: boolean;
  showCatalogUnauthenticated?: boolean;
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
  lookupService?: LookupServiceConfig;
  sessionBouncer?: SessionBouncerConfig;
}

const CONFIG_DIR = process.env.CONFIG_DIR || join(process.cwd(), "config");

let siteCache: SiteConfig | null = null;

export function getSiteConfig(): SiteConfig {
  if (!siteCache) {
    const raw = readFileSync(join(CONFIG_DIR, "site.json"), "utf-8");
    const config = JSON.parse(raw) as SiteConfig;
    validateSiteConfig(config);
    siteCache = config;
  }
  return siteCache;
}

function validateSiteConfig(config: SiteConfig): void {
  if (!config.backend || !["lookup-service", "session-bouncer"].includes(config.backend)) {
    throw new Error(
      `Invalid or missing "backend" in site.json. Must be "lookup-service" or "session-bouncer".`
    );
  }

  if (typeof config.requireAuth !== "boolean") {
    throw new Error(`"requireAuth" must be a boolean in site.json.`);
  }

  if (config.backend === "lookup-service") {
    const ls = config.lookupService;
    if (!ls || !ls.lookupServiceUrl || !ls.tenantName || !ls.credentials?.username || !ls.credentials?.password) {
      throw new Error(
        `"lookupService" config is missing or incomplete. Required: lookupServiceUrl, tenantName, credentials.username, credentials.password.`
      );
    }
  }

  if (config.backend === "session-bouncer") {
    const sb = config.sessionBouncer;
    if (!sb || !sb.bouncerUrl || !sb.issuer) {
      throw new Error(
        `"sessionBouncer" config is missing or incomplete. Required: bouncerUrl, issuer.`
      );
    }

    if (!process.env.VOUCHER_SIGNING_KEY && !sb.voucherSigningKey) {
      throw new Error(
        `No voucher signing key configured. Set VOUCHER_SIGNING_KEY env var or sessionBouncer.voucherSigningKey in site.json.`
      );
    }

    const trustedVoucher = sb.trustedVoucher !== false;
    if (trustedVoucher && !config.requireAuth) {
      throw new Error(
        `When using session-bouncer with trustedVoucher (default), requireAuth must be true (portal needs user email for voucher).`
      );
    }
  }
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
