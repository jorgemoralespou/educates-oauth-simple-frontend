# Educates OAuth Simple Frontend

A simple Next.js web application that provides authentication via username/password and optional OAuth (Microsoft, GitHub, Google) using [Better Auth](https://www.better-auth.com/), and displays a portal page with workshop tiles. Clicking a tile requests a workshop session via one of two backends — the [Educates Lookup Service](https://docs.educates.dev/en/latest/lookup-service/service-overview.html) or the **Session Bouncer** — and redirects the user to the session.

## Project Structure

```
├── config/
│   ├── site.json.example           # Main configuration template
│   ├── theme.css.example           # Theme override template
│   └── logo.svg|png|jpg|webp       # (optional) Custom logo for the header
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (loads theme CSS)
│   │   ├── page.tsx                # Home — login or portal depending on config
│   │   ├── login/page.tsx          # Dedicated login page with returnTo support
│   │   ├── portal/page.tsx         # Protected portal tiles page
│   │   ├── courses/
│   │   │   ├── page.tsx            # Course catalog page
│   │   │   └── [slug]/page.tsx     # Individual course detail page
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── [...all]/route.ts         # Better Auth handler
│   │       │   └── credential-login/route.ts # Username/password login
│   │       ├── logo/route.ts       # Serves custom logo from config
│   │       └── workshops/[name]/route.ts     # Workshop session request
│   ├── lib/
│   │   ├── auth.ts               # Better Auth config (SQLite + conditional providers)
│   │   ├── auth-client.ts        # Client-side auth hooks
│   │   ├── educates.ts           # Lookup Service session request
│   │   ├── session-bouncer.ts    # Session Bouncer voucher generator
│   │   └── config.ts             # Site config + theme loader
│   ├── components/
│   │   ├── Header.tsx            # Dark header with logo + nav
│   │   ├── LoginButtons.tsx      # Login form + optional social buttons
│   │   ├── CourseCard.tsx         # Course card for catalog view
│   │   ├── CourseView.tsx         # Course detail with workshop list
│   │   ├── WorkshopCard.tsx       # Workshop tile card
│   │   ├── WorkshopView.tsx       # Workshop display with autoLaunch support
│   │   └── UserMenu.tsx          # Sign out button
│   ├── instrumentation.ts        # Startup instrumentation
│   └── middleware.ts             # Route protection
├── docs/
│   └── workflows.md             # Session bouncer workflow diagrams
├── scripts/
│   ├── migrate-db.js             # Auto-runs Better Auth schema migration
│   └── better-auth-schema.sql    # SQLite schema definition
├── k8s/
│   ├── generate-secret.sh        # Generates the config Secret from local files
│   ├── application/              # ytt templates for the frontend
│   │   ├── 01-namespace.yaml
│   │   ├── 02-secret.yaml        # Config Secret (site.json, theme.css, logo.*)
│   │   ├── 02-secretcopier.yaml  # Copies TLS/CA secrets via Educates SecretCopier
│   │   ├── 03-deployment.yaml    # Mounts individual config files from Secret
│   │   ├── 04-service.yaml       # Port 80 → 3000
│   │   └── 05-ingress.yaml       # Host-based routing with optional TLS
│   └── lookup/
│       └── resources.yaml        # Educates Lookup Service resources (ytt)
├── values.yaml.example           # ytt values template for Kubernetes
├── Dockerfile                    # Multi-stage standalone build
└── package.json
```

## Getting Started Locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your site configuration:

   ```bash
   cp config/site.json.example config/site.json
   ```

   Edit `config/site.json` — at minimum set the `backend`, `betterAuth.secret`, and add a static user under `authProviders.static`. See [Site Configuration](#site-configuration-configsitejson) below for the full schema.

3. (Optional) Create a theme override:

   ```bash
   cp config/theme.css.example config/theme.css
   ```

4. Run the database migration (creates SQLite tables for Better Auth session management):

   ```bash
   npx @better-auth/cli migrate
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Visit `http://localhost:3000`

## Configuration

All application configuration lives in the `config/` directory. The main configuration file is `config/site.json`, with optional `theme.css` and logo files alongside it. When deploying to Kubernetes, these files are bundled into a single Secret (see [Configuration Secret](#configuration-secret)).

### Site Configuration (`config/site.json`)

```json
{
  "title": "Educates Workshop Portal",
  "description": "Access your workshop sessions",
  "homeUrl": "http://localhost:3000",
  "backend": "lookup-service",
  "requireAuth": true,
  "showCatalogUnauthenticated": false,
  "betterAuth": {
    "secret": "generate-with-openssl-rand-base64-32",
    "baseURL": "http://localhost:3000"
  },
  "authProviders": {
    "static": [
      { "email": "user@example.com", "password": "changeme", "name": "Example User" }
    ],
    "microsoft": { "clientId": "", "clientSecret": "", "tenantId": "common" },
    "github": { "clientId": "", "clientSecret": "" },
    "google": { "clientId": "", "clientSecret": "" }
  },
  "courses": [
    {
      "name": "Example Course",
      "slug": "example-course",
      "description": "An example course with introductory workshops",
      "difficulty": "beginner",
      "workshops": [
        {
          "title": "Example Workshop",
          "description": "Description of the workshop",
          "workshopName": "workshop-name-here",
          "difficulty": "beginner",
          "duration": "30m"
        }
      ]
    }
  ],
  "lookupService": {
    "lookupServiceUrl": "https://lookup.example.com",
    "tenantName": "default",
    "credentials": {
      "username": "tenant-user",
      "password": "changeme"
    }
  }
}
```

| Field | Description |
|---|---|
| `title` | Displayed in the header and page title |
| `description` | Portal description |
| `homeUrl` | Base URL of the application |
| `backend` | **Required.** `"lookup-service"` or `"session-bouncer"` — selects which backend allocates workshop sessions |
| `requireAuth` | **Required.** When `true`, the portal requires login (via Better Auth). When `false`, no portal auth — the catalog is public |
| `showCatalogUnauthenticated` | When `true` (and `requireAuth` is `true`), shows the course catalog without login but requires auth to start a workshop. Default `false` |
| `betterAuth.secret` | Session secret — generate with `openssl rand -base64 32` |
| `betterAuth.baseURL` | Public URL for Better Auth callbacks |
| `authProviders.static` | Array of local user accounts (email/password login). Omit or leave empty to disable credential login |
| `authProviders.microsoft` | Microsoft OAuth — set `clientId` and `clientSecret` to enable. Optional `tenantId` (defaults to `common`) |
| `authProviders.github` | GitHub OAuth — set `clientId` and `clientSecret` to enable |
| `authProviders.google` | Google OAuth — set `clientId` and `clientSecret` to enable |
| `courses` | Array of courses, each containing a `name`, `slug`, `description`, optional `difficulty`, and a `workshops` array |
| `courses[].workshops` | Array of workshops within a course (`title`, `description`, `workshopName`, optional `difficulty` and `duration`) |
| `lookupService` | Lookup Service connection settings (required when `backend` is `"lookup-service"`) |
| `sessionBouncer` | Session Bouncer settings (required when `backend` is `"session-bouncer"`) — see [Session Bouncer Backend](#session-bouncer-backend) |

Social login buttons appear only when the corresponding `clientId` is set to a non-empty value. You can enable any combination, or none at all for a credentials-only setup.

### Custom Logo

Place a logo file in the `config/` directory to replace the default header logo. Supported formats: `logo.svg`, `logo.png`, `logo.jpg`, `logo.jpeg`, `logo.webp`. The first file found (in that order) is used. The logo is served via the `/api/logo` endpoint.

### Theme Customization (`config/theme.css`)

Optionally override the default look and feel by providing a `config/theme.css` file with CSS custom properties:

```css
:root {
  --header-bg: #1a1f36;
  --header-text: #ffffff;
  --page-bg: #f5f7fa;
  --card-bg: #ffffff;
  --card-border: #e5e7eb;
  --primary: #4285f4;
  --primary-hover: #3367d6;
  --primary-text: #ffffff;
  --input-border: #d1d5db;
  --input-focus-ring: #4285f4;
  --text-primary: #111827;
  --text-secondary: #4b5563;
  --text-muted: #6b7280;
  --error-text: #dc2626;
  --divider: #d1d5db;
}
```

Only include the variables you want to override — defaults are defined in `src/app/globals.css`.

## Authentication

The login page always shows an email/password form when `authProviders.static` is defined. Credentials are validated against the static user list — there is no sign-up flow.

Social login buttons (Microsoft, GitHub, Google) appear only when the corresponding provider has a non-empty `clientId` in `site.json`. You can enable any combination of providers simultaneously.

All OAuth providers use the callback URL pattern:

```
<baseURL>/api/auth/callback/<provider>
```

where `<baseURL>` is the value of `betterAuth.baseURL` in your `site.json` (e.g. `http://localhost:3000` for local development, or `https://portal.example.com` for production).

### GitHub OAuth

1. Go to the [GitHub Developer Settings](https://github.com/settings/developers) and create a new **OAuth App** (or GitHub App).
2. Set the **Authorization callback URL** to:
   - Local: `http://localhost:3000/api/auth/callback/github`
   - Production: `https://portal.example.com/api/auth/callback/github`
3. If using a **GitHub App** (not an OAuth App), you must manually enable email access:
   - Navigate to **Permissions and Events** > **Account Permissions** > **Email Addresses**
   - Select **Read-Only** and save
4. Copy the **Client ID** and **Client Secret** into your `site.json`:

   ```json
   "authProviders": {
     "github": {
       "clientId": "your-github-client-id",
       "clientSecret": "your-github-client-secret"
     }
   }
   ```

> GitHub does not issue refresh tokens for OAuth applications. Access tokens remain valid unless revoked or unused for a year.

### Google OAuth

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) > **APIs & Services** > **Credentials**.
2. Click **Create Credentials** > **OAuth client ID**.
3. Choose **Web application** as the application type.
4. Under **Authorized redirect URIs**, add:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://portal.example.com/api/auth/callback/google`
5. Copy the **Client ID** and **Client Secret** into your `site.json`:

   ```json
   "authProviders": {
     "google": {
       "clientId": "your-google-client-id",
       "clientSecret": "your-google-client-secret"
     }
   }
   ```

> Make sure `betterAuth.baseURL` in your `site.json` matches the origin you registered in Google Cloud Console, as Better Auth uses it to construct the callback URL.

### Microsoft Entra ID (Azure AD)

1. Go to the [Azure Portal](https://portal.azure.com/) > **Microsoft Entra ID** > **App registrations** > **New registration**.
2. Give the app a name and select the appropriate **Supported account types**:
   - **Single tenant** — only users in your organization
   - **Multitenant** — users in any Microsoft Entra directory
   - **Multitenant + personal Microsoft accounts** — broadest access
3. Under **Redirect URI**, select **Web** and set it to:
   - Local: `http://localhost:3000/api/auth/callback/microsoft`
   - Production: `https://portal.example.com/api/auth/callback/microsoft`
4. After registration, go to **Certificates & secrets** > **New client secret** and copy the secret value.
5. Copy the **Application (client) ID** and the **client secret** into your `site.json`:

   ```json
   "authProviders": {
     "microsoft": {
       "clientId": "your-azure-client-id",
       "clientSecret": "your-azure-client-secret",
       "tenantId": "your-tenant-id"
     }
   }
   ```

| `tenantId` value | Who can sign in |
|---|---|
| `"common"` (default) | Any Microsoft account (work/school + personal) |
| `"organizations"` | Any work or school account |
| `"consumers"` | Personal Microsoft accounts only |
| A specific tenant ID (GUID) | Only users from that specific directory |

> If you omit `tenantId`, it defaults to `"common"`.

## Backends

The `backend` field in `site.json` selects which system allocates workshop sessions. The two backends are mutually exclusive.

### Lookup Service Backend

Set `"backend": "lookup-service"` and provide the `lookupService` config section:

```json
{
  "backend": "lookup-service",
  "requireAuth": true,
  "lookupService": {
    "lookupServiceUrl": "https://lookup.example.com",
    "tenantName": "default",
    "credentials": {
      "username": "tenant-user",
      "password": "changeme"
    }
  }
}
```

The portal calls the Lookup Service REST API to allocate a workshop session and redirects the user to the `sessionActivationUrl`.

### Session Bouncer Backend

Set `"backend": "session-bouncer"` and provide the `sessionBouncer` config section:

```json
{
  "backend": "session-bouncer",
  "requireAuth": true,
  "sessionBouncer": {
    "bouncerUrl": "https://bouncer.example.com",
    "issuer": "my-frontend",
    "trustedVoucher": true
  }
}
```

| Field | Description |
|---|---|
| `sessionBouncer.bouncerUrl` | Base URL of the session bouncer service |
| `sessionBouncer.issuer` | Issuer name — must match the IssuerConfig name in the cluster |
| `sessionBouncer.voucherSigningKey` | Signing key for JWT vouchers (fallback if `VOUCHER_SIGNING_KEY` env var is not set) |
| `sessionBouncer.trustedVoucher` | Default `true`. When `true`, the portal includes the user's email in the signed JWT (trusted-voucher mode). When `false`, the bouncer handles its own OAuth authentication |

The signing key can be provided via the `VOUCHER_SIGNING_KEY` environment variable (preferred) or `sessionBouncer.voucherSigningKey` in `site.json`.

The session bouncer supports two authentication modes:

#### Trusted-Voucher Mode

Config: `requireAuth: true`, `trustedVoucher: true` (default)

The portal authenticates the user via Better Auth and includes `user_email` and `given_name` in the signed JWT voucher. The bouncer trusts the portal's identity assertion — single login for the user.

**Cluster resources needed**: Signing key Secret, IssuerConfig (no authProviders), BackendConfig.

#### OAuth Mode

Config: `requireAuth: false`, `trustedVoucher: false`

The portal is stateless — no auth, no sessions. The JWT voucher omits `user_email`. After receiving the voucher, the bouncer redirects the user to authenticate with its own OAuth provider (e.g., GitHub).

**Cluster resources needed**: Signing key Secret, AuthProviderConfig (e.g., GitHub), IssuerConfig (with authProviders), BackendConfig. Requires a separate GitHub OAuth App registered with the bouncer's callback URL.

See [docs/workflows.md](docs/workflows.md) for detailed step-by-step workflow diagrams.

#### Comparison

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

## Key Flows

- **Login**: `/` shows email/password form (and optional social buttons) → redirects to `/courses` on success (when `requireAuth` is `true` and `showCatalogUnauthenticated` is `false`)
- **Public catalog**: When `requireAuth` is `false` or `showCatalogUnauthenticated` is `true`, `/` shows the course catalog directly
- **Course catalog**: `/courses` lists all available courses as cards
- **Course detail**: `/courses/[slug]` shows the workshops within a course
- **Workshop start (lookup-service)**: Click "Start workshop" → calls `/api/workshops/[name]` → backend calls Educates Lookup Service → returns `sessionActivationUrl` → browser redirects to the workshop session
- **Workshop start (session-bouncer)**: Click "Start workshop" → calls `/api/workshops/[name]` → backend generates signed JWT voucher → returns redirect URL → browser redirects to session bouncer → bouncer allocates session
- **Auto-launch**: Navigate to `/?autoLaunch=workshop-name` to automatically start a workshop after page load

## Docker

Pre-built images are published to GitHub Container Registry on every push to `main` and on version tags:

```bash
docker pull ghcr.io/educates/educates-oauth-simple-frontend:latest
```

To build locally:

```bash
docker build -t ghcr.io/educates/educates-oauth-simple-frontend .
```

Run the container:

```bash
docker run -p 3000:3000 \
  -v ./config:/app/config \
  ghcr.io/educates/educates-oauth-simple-frontend:latest
```

For the session-bouncer backend, also pass the signing key:

```bash
docker run -p 3000:3000 \
  -v ./config:/app/config \
  -e VOUCHER_SIGNING_KEY=your-signing-key \
  ghcr.io/educates/educates-oauth-simple-frontend:latest
```

The container automatically runs the Better Auth database migration on startup — there is no need to run `npx @better-auth/cli migrate` manually.

Ensure `config/site.json` exists in the mounted volume with at minimum the `backend`, `betterAuth.secret`, and `betterAuth.baseURL` fields configured.

## Kubernetes Deployment

The Kubernetes manifests use [ytt](https://carvel.dev/ytt/) templates. The deployment mounts individual configuration files (`site.json`, `theme.css`, logo images) from a single Kubernetes Secret into the pod.

### Configuration Secret

The configuration Secret (`educates-frontend-config`) contains all the files from your `config/` directory, base64-encoded. You can generate it using the provided helper script:

```bash
k8s/generate-secret.sh [OPTIONS] [CONFIG_DIR]
```

The script reads your `config/` directory and produces a Secret manifest containing:

| File | Required | Description |
|---|---|---|
| `site.json` | Yes | Main site configuration |
| `theme.css` | No | Custom CSS theme overrides |
| `logo.svg`, `logo.png`, `logo.jpg`, `logo.jpeg`, `logo.webp` | No | Custom logo for the header |

Options:

| Flag | Description |
|---|---|
| `-o, --output FILE` | Write manifest to a file instead of stdout |
| `-n, --name NAME` | Secret name (default: `educates-frontend-config`) |
| `-N, --namespace NS` | Namespace (default: `educates-portal`) |

Examples:

```bash
# Generate from ./config and print to stdout
k8s/generate-secret.sh

# Generate from a custom config directory
k8s/generate-secret.sh /path/to/config

# Write to a file with custom secret name and namespace
k8s/generate-secret.sh -n my-secret -N my-ns -o secret.yaml /path/to/config
```

The Deployment mounts each file from the Secret individually into `/app/config/` using `subPath`, so the application sees them as regular files:

```
/app/config/site.json
/app/config/theme.css
/app/config/logo.svg
/app/config/logo.png
...
```

### 1. Create your values file

```bash
cp values.yaml.example values.yaml
```

Edit `values.yaml` to set your image, domain, namespace, and TLS/CA secret references:

```yaml
#@data/values
---
image: ghcr.io/educates/educates-oauth-simple-frontend:latest
domain: example.com
namespace: educates-portal
voucherSigningKeySecretRef:
ingress:
  tlsSecretRef:
    name: example.com-tls
    namespace: educates-secrets
  caSecretRef:
    name: example.com-ca
    namespace: educates-secrets
```

| Value | Description |
|---|---|
| `image` | Container image reference |
| `domain` | Base domain — the portal is exposed at `portal.<domain>` |
| `namespace` | Kubernetes namespace to deploy into |
| `voucherSigningKeySecretRef` | Optional. Reference to a Secret containing the voucher signing key (for session-bouncer backend). Set `name` and optionally `key` (default: `signing-key`) |
| `ingress.tlsSecretRef` | Reference to a TLS Secret for HTTPS (name + source namespace). Set to empty to disable TLS |
| `ingress.caSecretRef` | Reference to a CA Secret for trusting self-signed certificates when calling the Lookup Service. Set to empty to disable |

When `tlsSecretRef` and `caSecretRef` are set, an Educates `SecretCopier` resource is created to copy those secrets into the target namespace.

### 2. Generate and apply the config Secret

```bash
k8s/generate-secret.sh -N educates-portal -o k8s/application/02-secret.yaml
```

### 3. Deploy with ytt

Render and apply the manifests:

```bash
ytt -f values.yaml -f k8s/application/ | kubectl apply -f -
```

This creates the namespace, the config Secret, the Deployment, Service, and Ingress. The Deployment mounts the individual config files from the Secret and uses an `emptyDir` volume for the SQLite database. On startup, the container runs the schema migration automatically.

### Educates Lookup Service Resources

If you also need to create the Lookup Service tenant and client configuration in the same cluster:

```bash
ytt -f values.yaml -f k8s/lookup/ | kubectl apply -f -
```

This creates `ClusterConfig`, `ClientConfig`, and `TenantConfig` resources matching the credentials in your `lookupService` config section.
