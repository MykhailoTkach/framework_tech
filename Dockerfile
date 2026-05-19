# Етап 1: встановлення залежностей
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev
RUN npm install pino-pretty drizzle-kit

# Етап 2: production образ
FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY . .

RUN addgroup -S app && adduser -S app -G app
RUN mkdir -p uploads data/backups && chown -R app:app /app
USER app

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]