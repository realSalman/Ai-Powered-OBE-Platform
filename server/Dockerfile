# Multi-stage Dockerfile for AtlasAI Backend
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src/ ./src/
RUN npm run build

# Production Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY ecosystem.config.js ./

# Install PM2 globally
RUN npm install -g pm2

# Run as non-root user
USER node

EXPOSE 5000

CMD ["npx", "pm2-runtime", "start", "ecosystem.config.js"]
