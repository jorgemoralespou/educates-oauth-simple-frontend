import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import Database from "better-sqlite3";
import { getSiteConfig } from "./config";

const site = getSiteConfig();

const socialProviders: Record<string, unknown> = {};

if (site.authProviders.microsoft?.clientId) {
  socialProviders.microsoft = {
    clientId: site.authProviders.microsoft.clientId,
    clientSecret: site.authProviders.microsoft.clientSecret,
    tenantId: site.authProviders.microsoft.tenantId || "common",
  };
}

if (site.authProviders.github?.clientId) {
  socialProviders.github = {
    clientId: site.authProviders.github.clientId,
    clientSecret: site.authProviders.github.clientSecret,
  };
}

if (site.authProviders.google?.clientId) {
  socialProviders.google = {
    clientId: site.authProviders.google.clientId,
    clientSecret: site.authProviders.google.clientSecret,
  };
}

export const enabledSocialProviders = Object.keys(socialProviders) as Array<
  "microsoft" | "github" | "google"
>;

export const hasStaticUsers =
  Array.isArray(site.authProviders.static) && site.authProviders.static.length > 0;

// Fail to start if no auth provider is defined
if (enabledSocialProviders.length === 0 && !hasStaticUsers) {
  throw new Error(
    "No auth providers configured in site.json. Define at least one social provider or static users in authProviders."
  );
}

export const auth = betterAuth({
  database: new Database("./data/auth.db"),
  baseURL: site.betterAuth.baseURL,
  secret: site.betterAuth.secret,
  socialProviders,
  emailAndPassword: {
    enabled: hasStaticUsers,
  },
  plugins: [nextCookies()],
});
