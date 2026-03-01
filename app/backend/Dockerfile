FROM node:20-alpine AS frontend-build
WORKDIR /workspace/frontend
COPY app/frontend/package*.json ./
RUN npm ci
COPY app/frontend/ ./
RUN npm run build

FROM node:20-alpine AS backend-build
WORKDIR /workspace/backend
COPY app/backend/package*.json ./
RUN npm ci --omit=dev
COPY app/backend/src ./src

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=backend-build /workspace/backend/node_modules ./node_modules
COPY --from=backend-build /workspace/backend/src ./src
COPY --from=frontend-build /workspace/frontend/dist ./public
EXPOSE 8080
CMD ["node", "src/server.js"]
