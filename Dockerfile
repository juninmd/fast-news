# ─── Stage 1: Build Frontend ──────────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder
RUN npm install -g pnpm
WORKDIR /app
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# ─── Stage 2: Build Backend ───────────────────────────────────────────────────
FROM node:22-alpine AS backend-builder
RUN npm install -g pnpm
WORKDIR /app
COPY backend/pnpm-lock.yaml backend/package.json ./
RUN pnpm install --frozen-lockfile
COPY backend/ ./
RUN pnpm run build

# ─── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
RUN apk add --no-cache curl
RUN npm install -g pnpm
WORKDIR /app

# Copy backend dependencies and build
COPY backend/pnpm-lock.yaml backend/package.json ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=backend-builder /app/dist ./dist

# Copy frontend build
COPY --from=frontend-builder /app/dist ./client

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["node", "dist/index.js"]
