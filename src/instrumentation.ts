export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.AUTH_BEFORE_CATALOG) {
    const { readFileSync } = await import("fs");
    const { join } = await import("path");
    try {
      const configDir =
        process.env.CONFIG_DIR || join(process.cwd(), "config");
      const raw = readFileSync(join(configDir, "site.json"), "utf-8");
      const config = JSON.parse(raw);
      process.env.AUTH_BEFORE_CATALOG =
        config.authBeforeCatalog === false ? "false" : "true";
    } catch {
      process.env.AUTH_BEFORE_CATALOG = "true";
    }
  }
}
