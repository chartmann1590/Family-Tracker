FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY backend/package*.json ./
RUN npm install

# Copy source code
# Copy source code
COPY backend/ .

# Copy APK from mobile_app build if it exists
# This ensures the latest APK is always included in the Docker build
# Copy APK from mobile_app build
# This ensures the latest APK is always included in the Docker build
# We copy directly to the destination. If this fails, it means the file is not in the build context.
COPY mobile_app/build/app/outputs/flutter-apk/app-release.apk ./downloads/family-tracker.apk

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies only
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy built files from builder
# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/downloads ./downloads

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/index.js"]
