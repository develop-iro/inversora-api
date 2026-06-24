# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder

# Husky is dev-only; skip git hooks during Docker installs (npm "prepare" script).
ENV HUSKY=0

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HUSKY=0

COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh

RUN npm ci --omit=dev \
  && npm install prisma@6.19.3 --no-save \
  && chmod +x ./scripts/docker-entrypoint.sh

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["./scripts/docker-entrypoint.sh"]
