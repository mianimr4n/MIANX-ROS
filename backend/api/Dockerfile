FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/api/package.json backend/api/
RUN pnpm install --frozen-lockfile --filter @telepizza/api...

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/api/node_modules ./backend/api/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/api ./backend/api
RUN pnpm --filter @telepizza/api build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/backend/api/dist ./dist
COPY --from=build /app/backend/api/package.json ./package.json
COPY --from=deps /app/backend/api/node_modules ./node_modules
EXPOSE 4000
CMD ["node", "dist/src/main.js"]
