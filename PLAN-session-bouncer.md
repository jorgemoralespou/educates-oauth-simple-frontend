# Plan: Add Session-Bouncer Backend Support

## Context

The app currently uses the Educates Lookup Service as its only backend for allocating workshop sessions. We want to add support for a second backend — the **session-bouncer** — which uses a JWT voucher + browser redirect flow instead of a REST API. The two backends are mutually exclusive, selected via a `backend` field in `site.json`.

The session-bouncer supports two authentication modes:

1. **Trusted-voucher mode**: The portal includes the user's email in the signed JWT voucher. The bouncer trusts the portal's identity assertion — no separate OAuth on the bouncer side. Single login for the user.

2. **OAuth mode**: The bouncer has its own OAuth providers (e.g., GitHub). After receiving the voucher, the bouncer redirects the user to authenticate with the OAuth provider. If `user_email` is present in the voucher, the bouncer validates it matches the OAuth-authenticated email. Double login, but the second may be transparent if the user has an active OAuth session.

In both modes, the portal generates a signed JWT and redirects the user's browser to `<bouncerUrl>/workshop/?voucher=<JWT>`. The bouncer validates the JWT, allocates a session, and redirects to the training portal.

## Design Decisions (confirmed with user)

- **Signing key**: environment variable `VOUCHER_SIGNING_KEY`
- **UX flow**: Keep the existing API route pattern — `WorkshopCard` calls `/api/workshops/[name]`, the API route generates the voucher server-side and returns the redirect URL
- **Config structure**: Rename `educates` to `lookupService`, add new `sessionBouncer` section, add top-level `backend` field
- **Auth config**: Replace `authBeforeCatalog: boolean` with two fields:
  - `requireAuth: boolean` — whether the portal does auth at all. Must be `true` when using trusted-voucher mode (portal needs user identity for the JWT). Can be `false` when bouncer handles OAuth.
  - `showCatalogUnauthenticated: boolean` — whether to show the course catalog without login. Can only be `true` when `requireAuth` is `true` (otherwise there's no auth to gate anyway).

---

## Changes

### 1. Update `SiteConfig` type and config loader

**File**: `src/lib/config.ts`

- Rename `EducatesConfig` to `LookupServiceConfig` (keep same shape)
- Add new `SessionBouncerConfig` interface:
  ```ts
  interface SessionBouncerConfig {
    bouncerUrl: string;         // e.g. "https://bouncer.example.com"
    issuer: string;             // must match IssuerConfig name in cluster
    voucherSigningKey?: string; // signing key (fallback if env var not set)
    trustedVoucher?: boolean;   // default true — include user_email in voucher
  }
  ```
- When `trustedVoucher` is `true` (default): the voucher includes `user_email` and `given_name` from the portal session. The bouncer IssuerConfig has no authProviders (trusted-voucher mode).
- When `trustedVoucher` is `false`: the voucher omits `user_email`. The bouncer handles its own OAuth authentication via AuthProviderConfig resources.
- Signing key precedence: `process.env.VOUCHER_SIGNING_KEY` > `sessionBouncer.voucherSigningKey` in site.json
- Update `SiteConfig`:
  ```ts
  interface SiteConfig {
    // ... existing fields ...
    backend: "lookup-service" | "session-bouncer";
    lookupService?: LookupServiceConfig;  // required when backend = "lookup-service"
    sessionBouncer?: SessionBouncerConfig; // required when backend = "session-bouncer"
  }
  ```
- `backend` is **required** — the app fails to start if it is not set or has an invalid value.

### 2. Replace `authBeforeCatalog` with `requireAuth` + `showCatalogUnauthenticated`

**Replaces**: `authBeforeCatalog: boolean` in `SiteConfig`

**New fields in `SiteConfig`**:
```ts
requireAuth: boolean;                  // whether the portal runs its own auth flow
showCatalogUnauthenticated?: boolean;  // show catalog without login (only valid when requireAuth is true)
```

**Behaviour matrix**:

| `requireAuth` | `showCatalogUnauthenticated` | Home page (`/`) | `/courses` | "Start Workshop" |
|---|---|---|---|---|
| `true` | `false` (default) | Login form | Requires login (middleware redirect) | Requires session |
| `true` | `true` | Course catalog (with login option) | Public | Requires session, redirects to login if needed |
| `false` | _(ignored)_ | Course catalog (no login UI) | Public | No portal auth check — bouncer handles auth |

**Validation**:
- If `backend === "session-bouncer"` and `trustedVoucher` is `true`: `requireAuth` must be `true` (portal needs user email for voucher)
- If `requireAuth` is `false` and `showCatalogUnauthenticated` is `true`: warn or ignore (catalog is always public when auth is off)

**Files affected**:

- `src/lib/config.ts` — Update `SiteConfig` type, remove `authBeforeCatalog`, add new fields
- `src/middleware.ts` — Replace `authBeforeCatalog` check: if `requireAuth` is `false`, skip all auth middleware. If `requireAuth` is `true` and `showCatalogUnauthenticated` is `false`, redirect unauthenticated users from `/courses` to `/`. If `showCatalogUnauthenticated` is `true`, allow `/courses` through.
- `src/app/page.tsx` — Replace `site.authBeforeCatalog` branch: if `requireAuth` is `false`, show `CourseView` directly (no login option). If `requireAuth` is `true` and `showCatalogUnauthenticated` is `false`, show login form or redirect to `/courses` if authenticated. If `showCatalogUnauthenticated` is `true`, show `CourseView` with optional login.
- `src/app/login/page.tsx` — Only accessible when `requireAuth` is `true`
- `src/app/courses/page.tsx`, `src/app/courses/[slug]/page.tsx` — Adjust `homeHref` logic (currently uses `authBeforeCatalog`)
- `src/components/CourseView.tsx`, `src/components/WorkshopView.tsx` — Update `homeHref` references
- `src/instrumentation.ts` — Update `authBeforeCatalog` reference
- `src/app/api/workshops/[name]/route.ts` — When `requireAuth` is `false`, skip session check (bouncer handles auth)
- `config/site.json.example` — Replace `authBeforeCatalog` with new fields
- `README.md` — Update documentation

### 3. Create session-bouncer voucher generator (unchanged)

**New file**: `src/lib/session-bouncer.ts`

- Install `jsonwebtoken` package (and `@types/jsonwebtoken` dev dep)
- Export `generateVoucherUrl(workshopName: string, userEmail: string, userName: string, indexUrl: string): string`
  - Reads config from `getSiteConfig().sessionBouncer`
  - Reads signing key with precedence: `process.env.VOUCHER_SIGNING_KEY` first, then `sessionBouncer.voucherSigningKey` from site.json as fallback
  - Builds JWT with claims: `iss`, `workshop_name`, `index_url`, `exp` (1h), `iat`, `jti` (uuid)
  - If `trustedVoucher` is `true` (default): also includes `user_email` and `given_name` from the authenticated session
  - If `trustedVoucher` is `false`: omits `user_email` and `given_name` — the bouncer will handle OAuth authentication
  - The `index_url` claim is the return URL (e.g. `https://portal.example.com/courses/my-course`) — same value the lookup service receives as `clientIndexUrl`
  - Signs with HS256
  - Returns `${bouncerUrl}/workshop/?voucher=${encodeURIComponent(jwt)}&index_url=${encodeURIComponent(indexUrl)}`
  - Note: `index_url` is passed both inside the JWT and as a query parameter — the bouncer uses the query param as the primary source, with the JWT claim as fallback

### 4. Update the workshop API route

**File**: `src/app/api/workshops/[name]/route.ts`

- Import `generateVoucherUrl` from the new module
- Read `backend` and `requireAuth` from site config
- If `requireAuth` is `true`: require a Better Auth session (existing check). Pass `session.user.email` and `session.user.name` to the voucher generator.
- If `requireAuth` is `false`: skip session check. Pass empty strings for email/name (bouncer will handle identity via its own OAuth).
- Both backends use the same `clientIndexUrl` (built from `homeUrl` + `returnPath`) as the return URL
- If `"lookup-service"`: existing flow (call `requestWorkshopSession` with `clientIndexUrl`, return `sessionActivationUrl`)
- If `"session-bouncer"`: call `generateVoucherUrl` with `clientIndexUrl` as the `indexUrl` param, return `{ sessionActivationUrl: voucherRedirectUrl }`
- The response shape stays the same (`{ sessionActivationUrl }`) so `WorkshopCard` needs no changes

### 5. Rename `educates` config in existing files

**File**: `src/lib/educates.ts`

- Update `getSiteConfig().educates` references to use `getSiteConfig().lookupService`

### 6. Startup validation

**File**: `src/lib/config.ts`

- In `getSiteConfig()`, after loading, validate:
  - Fail if `backend` is missing or not one of `"lookup-service"` | `"session-bouncer"`
  - If `backend === "session-bouncer"`: fail if `sessionBouncer` section is missing, or if `bouncerUrl` / `issuer` are empty, or if neither `process.env.VOUCHER_SIGNING_KEY` nor `sessionBouncer.voucherSigningKey` is set
  - If `backend === "lookup-service"`: fail if `lookupService` section is missing, or if `lookupServiceUrl`, `tenantName`, or `credentials` are empty
  - If `requireAuth` is not a boolean: fail
  - If `backend === "session-bouncer"` and `trustedVoucher` is `true` and `requireAuth` is `false`: fail (portal must authenticate users to include email in voucher)

### 7. Update `site.json.example`

**File**: `config/site.json.example`

- Replace `"authBeforeCatalog"` with `"requireAuth"` and `"showCatalogUnauthenticated"`
- Add `"backend": "lookup-service"` field
- Rename `"educates"` to `"lookupService"`
- Add `sessionBouncer` example:
  ```json
  {
    "backend": "lookup-service",
    "requireAuth": true,
    "showCatalogUnauthenticated": false,
    "lookupService": { ... },
    "sessionBouncer": {
      "bouncerUrl": "https://bouncer.example.com",
      "issuer": "my-frontend",
      "trustedVoucher": true
    }
  }
  ```

### 8. Update secret and deployment manifests

**File**: `k8s/application/03-deployment.yaml`

- Add optional `VOUCHER_SIGNING_KEY` env var from a Secret reference (conditionally, when using session-bouncer)

**File**: `values.yaml.example`

- Add optional `voucherSigningKeySecretRef` value for the signing key Secret

### 9. Update README.md

**File**: `README.md`

- Document the `backend` field, `requireAuth`, `showCatalogUnauthenticated`, and both backend configurations
- Update the site.json example and field table
- Add a **"Session Bouncer Backend"** section with:
  - `site.json` config with `sessionBouncer` section and `trustedVoucher` flag
  - Setting `VOUCHER_SIGNING_KEY` env var (or `voucherSigningKey` in site.json)
  - **Cluster-side setup for trusted-voucher mode**:
    - Signing key Secret
    - IssuerConfig with no authProviders
    - BackendConfig for local cluster
  - **Cluster-side setup for OAuth mode**:
    - Signing key Secret
    - AuthProviderConfig for GitHub (with clientId, clientSecret secretRef, claimMappings)
    - IssuerConfig with authProviders referencing the AuthProviderConfig
    - BackendConfig for local cluster
    - Note: requires a separate GitHub OAuth App registration with the bouncer's callback URL (`<bouncerUrl>/auth/callback/github`)
  - Comparison table: trusted-voucher vs OAuth mode (UX, security model, cluster resources)
- Add **workflow diagrams** for the two session-bouncer flows (see step 11)

### 10. Document workflow diagrams

**New file**: `docs/workflows.md`

Document the two session-bouncer workflows with step-by-step flow diagrams:

#### Workflow 1: Trusted-voucher mode (auth on the portal)

```
Config: backend: "session-bouncer", requireAuth: true, trustedVoucher: true

User ──► Portal (/)
         │
         ├─ requireAuth: true → show login form
         │
User ──► Portal: Login (GitHub OAuth via Better Auth)
         │
         ├─ GitHub ──► callback ──► Better Auth session created
         │              (user email + name stored in session)
         │
User ──► Portal: Browse courses (/courses, /courses/[slug])
         │
User ──► Portal: Click "Start Workshop"
         │
         ├─ Frontend calls GET /api/workshops/[name]
         │
         ├─ API route:
         │   1. Reads Better Auth session → user email + name
         │   2. Generates signed JWT voucher:
         │      - iss: "my-frontend" (from sessionBouncer.issuer)
         │      - workshop_name: "workshop-slug"
         │      - user_email: "user@example.com" (from session)
         │      - given_name: "User Name" (from session)
         │      - index_url: "https://portal.example.com/courses/my-course"
         │      - exp, iat, jti
         │   3. Signs with VOUCHER_SIGNING_KEY (HS256)
         │   4. Returns { sessionActivationUrl: "<bouncerUrl>/workshop/?voucher=<JWT>&index_url=<url>" }
         │
User ──► Browser redirect to Session Bouncer
         │
         ├─ Bouncer: Validates JWT signature against IssuerConfig signing key
         ├─ Bouncer: No authProviders configured → trusted-voucher mode
         ├─ Bouncer: Uses user_email from JWT as authenticated identity
         ├─ Bouncer: Allocates workshop session on training portal
         ├─ Bouncer: Redirects to session activation URL
         │
User ──► Training Portal (workshop session)
         │
         ├─ When done: redirects back to index_url
         │
User ──► Portal (/courses/my-course)
```

**Key points**: Single login (on the portal). The portal vouches for the user's identity via the signed JWT. The bouncer trusts the portal's assertion.

#### Workflow 2: OAuth mode (auth on the session bouncer)

```
Config: backend: "session-bouncer", requireAuth: false, trustedVoucher: false

User ──► Portal (/)
         │
         ├─ requireAuth: false → show course catalog directly (no login)
         │
User ──► Portal: Browse courses (/courses, /courses/[slug])
         │
User ──► Portal: Click "Start Workshop"
         │
         ├─ Frontend calls GET /api/workshops/[name]
         │
         ├─ API route:
         │   1. requireAuth is false → skip session check
         │   2. Generates signed JWT voucher:
         │      - iss: "my-frontend" (from sessionBouncer.issuer)
         │      - workshop_name: "workshop-slug"
         │      - (NO user_email — bouncer will authenticate)
         │      - index_url: "https://portal.example.com/courses/my-course"
         │      - exp, iat, jti
         │   3. Signs with VOUCHER_SIGNING_KEY (HS256)
         │   4. Returns { sessionActivationUrl: "<bouncerUrl>/workshop/?voucher=<JWT>&index_url=<url>" }
         │
User ──► Browser redirect to Session Bouncer
         │
         ├─ Bouncer: Validates JWT signature against IssuerConfig signing key
         ├─ Bouncer: authProviders configured → OAuth mode
         ├─ Bouncer: Redirects user to GitHub OAuth
         │
User ──► GitHub: Authenticate (or auto-approve if session exists)
         │
         ├─ GitHub ──► bouncer callback (/auth/callback/github)
         ├─ Bouncer: Exchanges code for user info (email, name)
         ├─ Bouncer: Creates session with OAuth identity
         ├─ Bouncer: Allocates workshop session on training portal
         ├─ Bouncer: Redirects to session activation URL
         │
User ──► Training Portal (workshop session)
         │
         ├─ When done: redirects back to index_url
         │
User ──► Portal (/courses/my-course)
```

**Key points**: Single login (on the bouncer via GitHub). The portal is stateless — no auth, no sessions. The bouncer independently verifies user identity via OAuth. Requires a separate GitHub OAuth App registered with the bouncer's callback URL.

The README should reference this document and include a brief comparison table:

| | Trusted-voucher | OAuth on bouncer |
|---|---|---|
| Login location | Portal | Session bouncer |
| Number of logins | 1 | 1 |
| Portal auth | Required (`requireAuth: true`) | None (`requireAuth: false`) |
| User identity source | Better Auth session → JWT `user_email` | Bouncer's GitHub OAuth |
| Bouncer auth config | No authProviders (IssuerConfig only) | AuthProviderConfig + IssuerConfig |
| GitHub OAuth App | Registered with portal callback URL | Registered with bouncer callback URL |
| Portal sessions/DB | SQLite for Better Auth | Not needed |
| Security model | Portal is trusted identity provider | Bouncer verifies identity independently |

### 11. Install dependency

- `npm install jsonwebtoken && npm install -D @types/jsonwebtoken`

---

## Files Summary

| File | Action |
|---|---|
| `src/lib/config.ts` | Edit — new types, rename educates→lookupService, replace `authBeforeCatalog`, validation |
| `src/lib/session-bouncer.ts` | **New** — voucher JWT generation |
| `src/lib/educates.ts` | Edit — use `lookupService` from config |
| `src/app/api/workshops/[name]/route.ts` | Edit — branch on `backend` type, conditional auth check |
| `src/middleware.ts` | Edit — replace `authBeforeCatalog` with `requireAuth` + `showCatalogUnauthenticated` |
| `src/app/page.tsx` | Edit — replace `authBeforeCatalog` branching |
| `src/app/login/page.tsx` | Edit — update `authBeforeCatalog` reference |
| `src/app/courses/page.tsx` | Edit — update `homeHref` logic |
| `src/app/courses/[slug]/page.tsx` | Edit — update `homeHref` logic |
| `src/components/CourseView.tsx` | Edit — update `homeHref` logic |
| `src/components/WorkshopView.tsx` | Edit — update `homeHref` logic |
| `src/instrumentation.ts` | Edit — update `authBeforeCatalog` reference |
| `config/site.json.example` | Edit — add `backend`, `requireAuth`, rename `educates`, add `sessionBouncer` |
| `k8s/application/03-deployment.yaml` | Edit — optional VOUCHER_SIGNING_KEY env |
| `values.yaml.example` | Edit — add signing key secret ref |
| `README.md` | Edit — document both backends, new auth fields, link to workflows |
| `docs/workflows.md` | **New** — detailed workflow diagrams for both session-bouncer modes |
| `package.json` | Edit — add `jsonwebtoken` dependency |

## What does NOT change

- `WorkshopCard.tsx` — response shape is the same (`sessionActivationUrl`), no changes needed
- Auth system (Better Auth, `src/lib/auth.ts`) — completely independent
- `generate-secret.sh` — no changes (signing key is an env var, not in the config secret)

## Task Checklist

- [ ] 1. Update SiteConfig type and config loader (rename educates→lookupService, add SessionBouncerConfig, add backend field)
- [ ] 2. Replace authBeforeCatalog with requireAuth + showCatalogUnauthenticated across all files
- [ ] 3. Create session-bouncer voucher generator (src/lib/session-bouncer.ts)
- [ ] 4. Update workshop API route to branch on backend type and conditional auth check
- [ ] 5. Rename educates config references in src/lib/educates.ts
- [ ] 6. Add startup validation for backend, requireAuth, and session-bouncer config
- [ ] 7. Update site.json.example with new config structure
- [ ] 8. Update k8s deployment manifest and values.yaml.example for VOUCHER_SIGNING_KEY
- [ ] 9. Update README.md with new config fields, session-bouncer backend docs, and cluster setup
- [ ] 10. Create docs/workflows.md with workflow diagrams for both session-bouncer modes
- [ ] 11. Install jsonwebtoken dependency
- [ ] 12. Build and verify (npm run build)

## Verification

1. **Lookup-service + requireAuth: true**: Set `backend: "lookup-service"`, `requireAuth: true`, `showCatalogUnauthenticated: false`. Verify: home shows login, `/courses` requires login, workshops launch via lookup service.
2. **Lookup-service + public catalog**: Set `requireAuth: true`, `showCatalogUnauthenticated: true`. Verify: home shows catalog, login required only when starting a workshop.
3. **Session-bouncer (trusted-voucher)**: Set `backend: "session-bouncer"`, `requireAuth: true`, `trustedVoucher: true`. Verify: portal auth required, JWT includes `user_email`.
4. **Session-bouncer (OAuth mode, no portal auth)**: Set `backend: "session-bouncer"`, `requireAuth: false`, `trustedVoucher: false`. Verify: catalog is public, no login UI, "Start Workshop" skips auth check, JWT omits `user_email`.
5. **Invalid config**: `trustedVoucher: true` + `requireAuth: false` — app should fail to start. Missing `backend` — fail. Missing `sessionBouncer` config — fail. No signing key — fail.
6. **Build**: Run `npm run build` to ensure no type errors.
