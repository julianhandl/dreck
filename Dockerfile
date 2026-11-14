# The Bun version lives only here; CI reads it from this line.
# The build output is plain JS, so the build stage runs natively and only the final stage is per platform.
FROM --platform=$BUILDPLATFORM oven/bun:1.4.4-alpine AS build
WORKDIR /repo
COPY package.json bun.lock ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
COPY packages/frontend/package.json packages/frontend/
RUN bun install --frozen-lockfile
COPY tsconfig.base.json ./
COPY packages packages
RUN bun run build

FROM oven/bun:1.4.4-alpine
WORKDIR /app
# Same relative layout as in the repo: backend/dist/server.js finds ../drizzle and ../../frontend/dist
COPY --from=build /repo/packages/backend/dist backend/dist
COPY --from=build /repo/packages/backend/drizzle backend/drizzle
COPY --from=build /repo/packages/frontend/dist frontend/dist
# Group 0 may write too: platforms like OpenShift run the container with a random UID in group 0
RUN mkdir /data && chown bun:0 /data && chmod 0770 /data
VOLUME /data
USER bun
ENV DRECK_PORT=3000 DRECK_DATA_DIR=/data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --start-interval=1s \
  CMD wget -qO- "http://127.0.0.1:${DRECK_PORT}/api/health" > /dev/null || exit 1
CMD ["bun", "backend/dist/server.js"]
