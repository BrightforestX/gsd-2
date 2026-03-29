# syntax=docker/dockerfile:1.7
# GSD-2 + Ruflo workspace image (sibling repos).
# Build: from this directory, run: docker compose build
# Compose uses additional_contexts so only gsd-2/ and ruflo/ are sent to the daemon.
FROM node:24-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    curl \
    openssh-client \
    python3 \
    make \
    g++ \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

COPY --from=gsd2 . /workspace/gsd-2
COPY --from=ruflo . /workspace/ruflo

WORKDIR /workspace/gsd-2
RUN npm ci

WORKDIR /workspace/ruflo
RUN npm ci || npm install

WORKDIR /workspace/ruflo/ruflo
RUN npm ci || npm install

WORKDIR /workspace/ruflo/ruflo/src/mcp-bridge
RUN npm ci || npm install

# Global `ruflo` → repo-root shim (same as local dev)
RUN printf '%s\n' '#!/usr/bin/env sh' 'exec node /workspace/ruflo/bin/ruflo.js "$@"' > /usr/local/bin/ruflo \
    && chmod +x /usr/local/bin/ruflo

ENV PATH="/workspace/ruflo/bin:/workspace/gsd-2/node_modules/.bin:${PATH}"

WORKDIR /workspace/gsd-2
CMD ["/bin/bash", "-l"]
