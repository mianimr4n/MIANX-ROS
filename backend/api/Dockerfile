FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/api/package.json backend/api/
RUN pnpm install --frozen-lockfile --filter @telepizza/api...

FROM base AS build
# Copy the full install tree so pnpm symlinks (including typescript) stay valid.
COPY --from=deps /app/ ./
# Copy only API sources; do not overwrite backend/api/node_modules from deps.
COPY backend/api/src ./backend/api/src
COPY backend/api/tsconfig.json ./backend/api/tsconfig.json
RUN pnpm --filter @telepizza/api build

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/api/package.json backend/api/
RUN pnpm install --frozen-lockfile --prod --filter @telepizza/api...

FROM node:22-alpine AS runner
WORKDIR /app/backend/api
ENV NODE_ENV=production
COPY --from=build /app/backend/api/dist ./dist
COPY --from=build /app/backend/api/package.json ./package.json
# Keep the full pnpm production tree so runtime symlinks resolve correctly.
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=prod-deps /app/backend/api/node_modules ./node_modules
EXPOSE 4000
CMD ["node", "dist/src/main.js"]
