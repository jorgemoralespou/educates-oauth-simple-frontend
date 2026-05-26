export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.REQUIRE_AUTH) {
    const { readFileSync } = await import("fs");
    const { join } = await import("path");
    try {
      const configDir =
        process.env.CONFIG_DIR || join(process.cwd(), "config");
      const raw = readFileSync(join(configDir, "site.json"), "utf-8");
      const config = JSON.parse(raw);
      process.env.REQUIRE_AUTH =
        config.requireAuth === false ? "false" : "true";
      process.env.SHOW_CATALOG_UNAUTHENTICATED =
        config.showCatalogUnauthenticated === true ? "true" : "false";
    } catch {
      process.env.REQUIRE_AUTH = "true";
      process.env.SHOW_CATALOG_UNAUTHENTICATED = "false";
    }
  }
}
