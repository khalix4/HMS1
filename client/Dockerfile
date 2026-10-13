# ==========================================
# Mayo HERCS - Client Frontend Dockerfile
# Ultra-fast & reliable static Nginx deployment
# ==========================================
FROM nginx:alpine AS runner

# Install wget for Docker healthcheck
RUN apk add --no-cache wget

# Copy built distribution assets
COPY dist /usr/share/nginx/html

# Copy custom Nginx configuration (reverse proxies /api and /socket.io to server)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
