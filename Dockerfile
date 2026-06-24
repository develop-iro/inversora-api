# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Skip lifecycle scripts (husky "prepare") — not needed in images; build runs prisma generate.
RUN npm ci --ignore-scripts

COPY . .

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh

RUN npm ci --omit=dev --ignore-scripts \
  && npx prisma generate \
  && npm install prisma@6.19.3 --no-save \
  && chmod +x ./scripts/docker-entrypoint.sh

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["./scripts/docker-entrypoint.sh"]
