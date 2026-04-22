# ─── Stage 1: Build Frontend ──────────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# ─── Stage 2: Build Backend ───────────────────────────────────────────────────
FROM node:22-alpine AS backend-builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --ignore-scripts
COPY backend/ ./
RUN npm run build

# ─── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
RUN apk add --no-cache curl
WORKDIR /app

# Copy backend dependencies and build
COPY backend/package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=backend-builder /app/dist ./dist

# Copy frontend build
COPY --from=frontend-builder /app/dist ./client

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["node", "dist/index.js"]
