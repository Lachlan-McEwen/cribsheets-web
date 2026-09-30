# Production image: Vite UI + Node API (SQLite via better-sqlite3)
FROM node:20-bookworm AS ui-build
WORKDIR /app
COPY package.json bun.lock ./
COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts index.html ./
COPY src ./src
COPY public ./public
COPY lib ./lib
RUN npm install && npm run build

FROM node:20-bookworm AS runtime
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY api/package.json api/package-lock.json ./api/
RUN npm ci --prefix api
COPY api/server ./api/server
COPY --from=ui-build /app/dist ./dist
COPY package.json ./
ENV NODE_ENV=production
ENV DATA_DIR=/data
EXPOSE 8080
CMD ["npm", "start"]
