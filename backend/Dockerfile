FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─── Runtime ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

RUN apk add --no-cache curl

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist
COPY src/database/schema.sql ./dist/database/schema.sql

ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "dist/index.js"]
