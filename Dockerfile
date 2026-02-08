FROM node:20-slim AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY mcp-server/package.json mcp-server/package-lock.json ./
RUN npm ci

# Copy source and compile TypeScript
COPY mcp-server/tsconfig.json ./
COPY mcp-server/src ./src
RUN npm run build

# --- Production image ---
FROM node:20-slim

WORKDIR /app

COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/build ./build

EXPOSE 3000

CMD ["node", "build/http.js"]
