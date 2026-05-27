FROM node:24-trixie-slim AS builder
WORKDIR /app
# Build toolchain for compiling the better-sqlite3 native addon (absent in slim).
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# `touch data/.keep` keeps the (otherwise empty) data dir in the image so it can
# be COPYed with the runtime user's ownership — the distroless runner has no
# shell to mkdir/chown it.
RUN mkdir -p data public && touch data/.keep && npm run build

# Distroless: no shell, no package manager, no apt/bash/perl/coreutils/ncurses —
# drastically smaller CVE surface. debian13 matches the builder's glibc (2.41),
# so the better-sqlite3 native addon stays binary-compatible. Runs as the
# built-in nonroot user (uid 65532).
FROM gcr.io/distroless/nodejs24-debian13 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/public ./public
COPY --from=builder --chown=65532:65532 /app/.next/standalone ./
COPY --from=builder --chown=65532:65532 /app/.next/static ./.next/static
COPY --from=builder --chown=65532:65532 /app/scripts ./scripts
COPY --from=builder --chown=65532:65532 /app/data ./data

USER 65532

EXPOSE 3000

# The distroless nodejs image's ENTRYPOINT is `node`; this runs the migration
# then the Next.js standalone server in one process (see scripts/start.js).
CMD ["scripts/start.js"]
