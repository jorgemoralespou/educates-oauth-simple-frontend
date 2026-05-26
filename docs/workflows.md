# Session Bouncer Workflows

This document describes the two authentication workflows supported by the session-bouncer backend.

## Workflow 1: Trusted-Voucher Mode (auth on the portal)

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

## Workflow 2: OAuth Mode (auth on the session bouncer)

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

## Comparison

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
