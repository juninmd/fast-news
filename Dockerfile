# ─── Stage 1: Build Frontend ──────────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder
RUN npm install -g pnpm@10
WORKDIR /app
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile --ignore-scripts && pnpm rebuild esbuild
COPY . .
RUN pnpm run build

# ─── Stage 2: Build Backend ───────────────────────────────────────────────────
FROM node:22-alpine AS backend-builder
RUN apk add --no-cache python3 make g++
RUN npm install -g pnpm@10
WORKDIR /app
COPY backend/pnpm-lock.yaml backend/package.json ./
RUN pnpm install --frozen-lockfile
COPY backend/ ./
RUN pnpm run build

# ─── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
RUN apk add --no-cache curl
WORKDIR /app

# Copy pre-built node_modules (includes compiled native binaries) and dist
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/dist ./dist
COPY backend/package.json ./

# Copy frontend build
COPY --from=frontend-builder /app/dist ./client

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["node", "dist/index.js"]
