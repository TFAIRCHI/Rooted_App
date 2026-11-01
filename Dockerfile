# syntax=docker/dockerfile:1
ARG NODE_IMAGE=node:24.11.1-bookworm-slim

FROM ${NODE_IMAGE} AS manifests
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json

FROM manifests AS backend-build
RUN npm ci --workspace=@gather/backend --include-workspace-root=false
COPY backend/tsconfig.json ./backend/tsconfig.json
COPY backend/src ./backend/src
COPY backend/contracts ./backend/contracts
COPY backend/migrations ./backend/migrations
COPY backend/scripts/copy-assets.mjs ./backend/scripts/copy-assets.mjs
RUN npm run build --workspace=@gather/backend

FROM manifests AS backend-dependencies
RUN npm ci --omit=dev --workspace=@gather/backend --include-workspace-root=false

FROM ${NODE_IMAGE} AS backend
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4000
WORKDIR /app/backend
COPY --from=backend-dependencies --chown=node:node /app/node_modules /app/node_modules
COPY --from=backend-dependencies --chown=node:node /app/backend /app/backend
COPY --from=backend-build --chown=node:node /app/backend/dist ./dist
USER node
EXPOSE 4000
CMD ["node", "dist/src/server.js"]

FROM manifests AS frontend-build
RUN npm ci --workspace=@gather/frontend --workspace=@gather/backend --include-workspace-root=false
COPY backend/contracts ./backend/contracts
COPY backend/src/auth/continuation.ts ./backend/src/auth/continuation.ts
COPY frontend ./frontend
ARG BACKEND_URL=http://rooted-api
ARG ROOTED_PUBLIC_ORIGIN=https://rooted-together.com
ENV BACKEND_URL=${BACKEND_URL} ROOTED_PUBLIC_ORIGIN=${ROOTED_PUBLIC_ORIGIN} ROOTED_CONTAINER_BUILD=true NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=@gather/frontend

FROM ${NODE_IMAGE} AS frontend
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1
ENV BACKEND_URL=http://rooted-api ROOTED_PUBLIC_ORIGIN=https://rooted-together.com
WORKDIR /app
COPY --from=frontend-build --chown=node:node /app/frontend/.next/standalone ./
COPY --from=frontend-build --chown=node:node /app/frontend/.next/static ./frontend/.next/static
COPY --from=frontend-build --chown=node:node /app/frontend/public ./frontend/public
USER node
EXPOSE 3000
CMD ["node", "frontend/server.js"]
