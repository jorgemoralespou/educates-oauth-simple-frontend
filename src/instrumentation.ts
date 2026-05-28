export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { getSiteConfig } = await import("@/lib/config");
  const { verifyLookupService } = await import("@/lib/educates");

  let site;
  try {
    site = getSiteConfig();
  } catch (err) {
    console.error(
      "[startup-check] could not read site.json:",
      err instanceof Error ? err.message : err,
    );
    return;
  }

  const lookupUrl = site.educates.lookupServiceUrl;

  if (site.support?.contactEmail && site.support?.contactUrl) {
    console.warn(
      "[startup-check] site.json defines both support.contactEmail and support.contactUrl. " +
        "These are mutually exclusive — contactUrl takes precedence and contactEmail will be ignored. " +
        "Set only one to silence this warning.",
    );
  }

  const result = await verifyLookupService();
  if (result.ok) {
    console.log(`[startup-check] lookup service reachable at ${lookupUrl}`);
    return;
  }

  console.error(
    `[startup-check] LOOKUP SERVICE UNAVAILABLE url=${lookupUrl} code=${result.code} — ${result.message}\n` +
      "  Check config/site.json educates.lookupServiceUrl and educates.credentials. " +
      "The app will continue to run; workshop launches will fail until this is fixed.",
  );
}
