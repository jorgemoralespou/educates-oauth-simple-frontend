# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Next.js 15 (App Router, React 19) web app that authenticates users (static email/password and/or Microsoft/GitHub/Google OAuth via Better Auth) and shows a portal of workshop tiles. Clicking a tile asks the [Educates Lookup Service](https://docs.educates.dev/en/latest/lookup-service/service-overview.html) for a session and redirects the browser to it.

## Commands

```bash
npm run dev      # dev server on :3000
npm run build    # production build (output: "standalone")
npm start        # run the standalone build
npm run lint     # next lint

npx @better-auth/cli migrate   # create SQLite tables (local dev, one-time)
node scripts/migrate-db.js     # idempotent schema apply (what containers run on startup)
```

There is no test suite. Before running anything, `config/site.json` must exist (copy from `config/site.json.example`).

## Architecture & non-obvious behavior

**Single config file drives everything.** All runtime config lives in `config/site.json` (schema and loader in `src/lib/config.ts`, type `SiteConfig`). `getSiteConfig()` reads and caches it on first call. `CONFIG_DIR` env var overrides the directory (set to `/app/config` in Kubernetes). `config/theme.css` is optional and overrides CSS custom properties defined in `src/app/globals.css`.

**Auth is configured at module load, not per-request.** `src/lib/auth.ts` runs `getSiteConfig()` at import time, builds `socialProviders` only for providers with a non-empty `clientId`, and **throws if no provider (static or social) is configured** — this crashes startup by design. `enabledSocialProviders` and `hasStaticUsers` are exported and used by the UI to decide which login options to show. Editing provider logic here affects whether the app boots.

**Static credential login bypasses Better Auth's signup flow.** `src/app/api/auth/credential-login/route.ts` validates email/password against `authProviders.static` in site.json, then lazily `signUpEmail`s the user into the SQLite DB (ignoring "already exists") purely so Better Auth can mint a session. There is no real sign-up. Better Auth's own handler lives at `src/app/api/auth/[...all]/route.ts` and handles the OAuth flows.

**`/portal` is gated by the page itself, not middleware.** `src/app/portal/page.tsx` runs in the Node runtime, reads `authBeforeCatalog` from site.json, validates the real session via `auth.api.getSession`, and redirects to `/` when required. There is intentionally no `middleware.ts` — an Edge middleware can't read site.json and would need a separate env var that drifts from the config, so the server-component check is the single source of truth across local dev, Docker, and Kubernetes.

**Lookup Service client caches its token.** `src/lib/educates.ts` (`requestWorkshopSession`) logs into the Lookup Service, caches the bearer token until ~60s before expiry, and retries once on a 401 with a fresh token. This is the only outbound integration.

**Workshop start flow:** PortalCard → `POST /api/workshops/[name]` → `requestWorkshopSession()` → Lookup Service `POST /api/v1/workshops` → returns `sessionActivationUrl` → browser redirects. `/?autoLaunch=<workshopName>` auto-starts on load.

## Deployment

- **Docker** (`Dockerfile`): multi-stage build. The `trixie-slim` builder installs `python3 make g++` to compile the `better-sqlite3` native addon, then `npm run build`. The runtime stage is **distroless** (`gcr.io/distroless/nodejs24-debian13`) — no shell, no package manager — for a minimal CVE surface; debian13 matches the builder's glibc so the native addon stays binary-compatible. It runs as nonroot uid 65532. Because distroless has no shell, the entrypoint is `scripts/start.js` (`CMD ["scripts/start.js"]`), a node launcher that runs the migration then the standalone server in one process — so the SQLite schema is created automatically on container start. Keep the builder and runtime on the **same Debian release** (trixie ↔ debian13) or the native addon's glibc linkage breaks. Images publish to `ghcr.io/educates/educates-oauth-simple-frontend` via `.github/workflows/build-image.yaml` on push to `main` and `v*` tags (also signs with cosign, generates SBOM, Trivy scan, Chainloop attestation).
- **Kubernetes** (`k8s/`): ytt templates rendered from a single `values.yaml` (copy from `values.yaml.example`). `siteConfig` becomes a Secret mounted at `/app/config/site.json`; SQLite lives in an `emptyDir` (ephemeral). Apply with `ytt -f values.yaml -f k8s/application/ | kubectl apply -f -`. `k8s/lookup/` separately provisions the Lookup Service tenant/client resources. A `SecretCopier` copies TLS/CA secrets when `ingress.tlsSecretRef`/`caSecretRef` are set; `NODE_EXTRA_CA_CERTS` lets the app trust self-signed Lookup Service certs.

## Note for edits

`config/site.json` and `values.yaml` are gitignored real configs (not just the `.example` files) — they may contain secrets. The `.test.*` directories are local test fixtures.
