import { readFileSync } from "fs";
import { join } from "path";

export interface PortalItem {
  title: string;
  description: string;
  workshopName: string;
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
  portals: PortalItem[];
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

let themeCache: string | null | undefined = undefined;

export function getThemeCSS(): string | null {
  if (themeCache === undefined) {
    try {
      themeCache = readFileSync(join(CONFIG_DIR, "theme.css"), "utf-8");
    } catch {
      themeCache = null;
    }
  }
  return themeCache;
}
