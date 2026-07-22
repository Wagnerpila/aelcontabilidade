# Build do frontend (Vite) + preparação do backend
FROM node:20-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
# Força a instalação das devDependencies (vite, plugins de build, etc.)
# mesmo que o ambiente de build injete NODE_ENV=production — sem isso o
# "npm ci" pula as devDependencies e o "npm run build" falha por falta do vite.
ENV NODE_ENV=development
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --include=dev
COPY . .
RUN npm run build

# Imagem final: só o necessário para rodar o servidor Node
FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server

RUN mkdir -p /app/server/uploads

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node server/index.js"]
