# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./
RUN npm install

# Copy source code
COPY frontend/ .

# Copy APK from mobile_app build if it exists
# This ensures the latest APK is always included in the Docker build
# Copy the mobile_app directory structure to access the build output
COPY mobile_app/ ./temp-mobile-app/
RUN mkdir -p public/downloads && \
    if [ -f ./temp-mobile-app/build/app/outputs/flutter-apk/app-release.apk ]; then \
      cp ./temp-mobile-app/build/app/outputs/flutter-apk/app-release.apk public/downloads/family-tracker.apk && \
      echo "✓ Latest APK copied from mobile_app build" && \
      rm -rf ./temp-mobile-app; \
    elif [ -f public/downloads/family-tracker.apk ]; then \
      echo "⚠ Using existing APK from frontend/public/downloads" && \
      rm -rf ./temp-mobile-app; \
    else \
      echo "⚠ Warning: No APK found. Build will continue but APK download won't be available." && \
      rm -rf ./temp-mobile-app; \
    fi

# Build the app
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration (from builder stage where it was copied)
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
