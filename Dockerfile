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
RUN mkdir /data && chown bun:bun /data
VOLUME /data
USER bun
EXPOSE 3000
CMD ["bun", "backend/dist/server.js"]
