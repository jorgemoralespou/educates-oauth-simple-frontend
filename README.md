# Educates OAuth Simple Frontend

A simple Next.js web application that provides authentication via username/password and optional OAuth (Microsoft, GitHub, Google) using [Better Auth](https://www.better-auth.com/), and displays a portal page with workshop tiles. Clicking a tile requests a workshop session from the [Educates Lookup Service](https://docs.educates.dev/en/latest/lookup-service/service-overview.html) and redirects the user to the session.

## Project Structure

```
├── config/
│   ├── site.json.example           # Main configuration template
│   └── theme.css.example           # Theme override template
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (loads theme CSS)
│   │   ├── page.tsx                # Home — login or portal depending on config
│   │   ├── login/page.tsx          # Dedicated login page with returnTo support
│   │   ├── portal/page.tsx         # Protected portal tiles page
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── [...all]/route.ts         # Better Auth handler
│   │       │   └── credential-login/route.ts # Username/password login
│   │       └── workshops/[name]/route.ts     # Educates session request
│   ├── lib/
│   │   ├── auth.ts               # Better Auth config (SQLite + conditional providers)
│   │   ├── auth-client.ts        # Client-side auth hooks
│   │   ├── educates.ts           # requestWorkshopSession() function
│   │   └── config.ts             # Site config + theme loader
│   ├── components/
│   │   ├── Header.tsx            # Dark header with logo + nav
│   │   ├── LoginButtons.tsx      # Login form + optional social buttons
│   │   ├── PortalCard.tsx        # Workshop tile card
│   │   ├── PortalView.tsx        # Portal display with autoLaunch support
│   │   └── UserMenu.tsx          # Sign out button
│   └── middleware.ts             # Route protection for /portal
├── scripts/
│   ├── migrate-db.js             # Auto-runs Better Auth schema migration
│   └── better-auth-schema.sql    # SQLite schema definition
├── k8s/
│   ├── application/              # ytt templates for the frontend
│   │   ├── 01-namespace.yaml
│   │   ├── 02-secret.yaml        # site.json Secret from values
│   │   ├── 02-secretcopier.yaml  # Copies TLS/CA secrets via Educates SecretCopier
│   │   ├── 03-deployment.yaml    # With conditional CA cert volume
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

   Edit `config/site.json` — at minimum set the `betterAuth.secret` and add a static user under `authProviders.static`. See [Site Configuration](#site-configuration-configsitejson) below for the full schema.

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

All application configuration lives in a single `config/site.json` file. When deploying to Kubernetes, this file is generated from `values.yaml` via ytt.

### Site Configuration (`config/site.json`)

```json
{
  "title": "Educates Workshop Portal",
  "description": "Access your workshop sessions",
  "homeUrl": "http://localhost:3000",
  "authBeforeCatalog": true,
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
  "portals": [
    {
      "title": "Spring Boot on Kubernetes",
      "description": "Introduction to Spring Boot on Kubernetes",
      "workshopName": "spring-boot-on-k8s"
    }
  ],
  "educates": {
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
| `authBeforeCatalog` | When `true`, users must log in before seeing the workshop catalog. When `false`, the catalog is shown on the home page with a login option |
| `betterAuth.secret` | Session secret — generate with `openssl rand -base64 32` |
| `betterAuth.baseURL` | Public URL for Better Auth callbacks |
| `authProviders.static` | Array of local user accounts (email/password login). Omit or leave empty to disable credential login |
| `authProviders.microsoft` | Microsoft OAuth — set `clientId` and `clientSecret` to enable. Optional `tenantId` (defaults to `common`) |
| `authProviders.github` | GitHub OAuth — set `clientId` and `clientSecret` to enable |
| `authProviders.google` | Google OAuth — set `clientId` and `clientSecret` to enable |
| `portals` | Array of workshop tiles (`title`, `description`, `workshopName`) |
| `educates` | Educates Lookup Service connection settings |

Social login buttons appear only when the corresponding `clientId` is set to a non-empty value. You can enable any combination, or none at all for a credentials-only setup.

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

Social login buttons (Microsoft, GitHub, Google) appear only when the corresponding provider has a non-empty `clientId` in `site.json`.

## Key Flows

- **Login**: `/` shows email/password form (and optional social buttons) → redirects to `/portal` on success (when `authBeforeCatalog` is `true`)
- **Public catalog**: When `authBeforeCatalog` is `false`, `/` shows the workshop catalog directly with an option to log in
- **Workshop start**: Click "Start workshop" → calls `/api/workshops/[name]` → backend calls Educates Lookup Service `POST /api/v1/workshops` → returns `sessionActivationUrl` → browser redirects to the workshop session
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

The container automatically runs the Better Auth database migration on startup — there is no need to run `npx @better-auth/cli migrate` manually.

Ensure `config/site.json` exists in the mounted volume with at minimum the `betterAuth.secret` and `betterAuth.baseURL` fields configured.

## Kubernetes Deployment

The Kubernetes manifests use [ytt](https://carvel.dev/ytt/) templates. All configuration, including the `site.json` content, is driven from a single `values.yaml` file.

### 1. Create your values file

```bash
cp values.yaml.example values.yaml
```

Edit `values.yaml` to set your image, domain, namespace, TLS/CA secret references, and the full site configuration:

```yaml
#@data/values
---
image: ghcr.io/educates/educates-oauth-simple-frontend:latest
domain: example.com
namespace: educates-portal
ingress:
  tlsSecretRef:
    name: example.com-tls
    namespace: educates-secrets
  caSecretRef:
    name: example.com-ca
    namespace: educates-secrets
siteConfig:
  title: "Educates Workshop Portal"
  homeUrl: "https://portal.example.com"
  authBeforeCatalog: true
  betterAuth:
    secret: "generate-with-openssl-rand-base64-32"
    baseURL: https://portal.example.com
  authProviders:
    static:
      - email: admin@example.com
        password: changeme
        name: Admin User
  portals:
    - title: "My Workshop"
      description: "Workshop description"
      workshopName: "my-workshop"
  educates:
    lookupServiceUrl: https://lookup.example.com
    tenantName: default
    credentials:
      username: tenant-user
      password: changeme
```

| Value | Description |
|---|---|
| `image` | Container image reference |
| `domain` | Base domain — the portal is exposed at `portal.<domain>` |
| `namespace` | Kubernetes namespace to deploy into |
| `ingress.tlsSecretRef` | Reference to a TLS Secret for HTTPS (name + source namespace). Set to empty to disable TLS |
| `ingress.caSecretRef` | Reference to a CA Secret for trusting self-signed certificates when calling the Lookup Service. Set to empty to disable |
| `siteConfig` | Full site configuration — rendered as `site.json` inside the pod |

When `tlsSecretRef` and `caSecretRef` are set, an Educates `SecretCopier` resource is created to copy those secrets into the target namespace.

### 2. Deploy with ytt

Render and apply the manifests:

```bash
ytt -f values.yaml -f k8s/application/ | kubectl apply -f -
```

This creates the namespace, a Secret containing `site.json`, the Deployment, Service, and Ingress. The Deployment mounts `site.json` from the Secret and uses an `emptyDir` volume for the SQLite database. On startup, the container runs the schema migration automatically.

### Educates Lookup Service Resources

If you also need to create the Lookup Service tenant and client configuration in the same cluster:

```bash
ytt -f values.yaml -f k8s/lookup/ | kubectl apply -f -
```

This creates `ClusterConfig`, `ClientConfig`, and `TenantConfig` resources matching the credentials in your `siteConfig.educates` section.
