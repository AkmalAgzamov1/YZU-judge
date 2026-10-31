# Builds the React app and serves it with Caddy, which also proxies /api to FastAPI
# and gets the HTTPS certificate. Built from the repository root.
FROM node:22-alpine AS build

WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY frontend/ ./
# Same origin as the site, so the browser needs no CORS.
ENV VITE_API_URL=/api
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile
