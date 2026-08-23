# ---- Stage 1: Build Frontend ----
FROM node:20-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ---- Stage 2: Production Server ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=10000

# Install backend dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy backend source code
COPY server/ ./server/
COPY sample-docs/ ./sample-docs/

# Copy compiled frontend from stage 1
COPY --from=client-builder /app/client/dist ./client/dist

# Create uploads & data persistence directory
RUN mkdir -p uploads data

EXPOSE 10000

CMD ["node", "server/index.js"]
