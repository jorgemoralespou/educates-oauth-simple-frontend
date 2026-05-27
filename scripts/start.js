#!/usr/bin/env node
// Container entrypoint. The distroless runtime has no shell, so this single
// process applies the Better Auth DB schema, then starts the Next.js server.
// Run from /app (WORKDIR): `node scripts/start.js`. migrate-db.js resolves its
// paths from process.cwd() and process.exit()s on failure; server.js is the
// Next.js standalone server, which must run with cwd at /app.
require("./migrate-db.js");
require("../server.js");
