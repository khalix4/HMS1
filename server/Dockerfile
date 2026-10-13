# ==========================================
# Mayo HERCS - Backend Server Dockerfile
# ==========================================
FROM node:20-slim AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Copy application source code and dependencies
COPY . .

# Expose backend REST API & WebSocket port
EXPOSE 5000

# Built-in Node 20 native healthcheck (zero external dependencies needed)
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:5000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start the Node.js HTTP & Socket.io server
CMD ["node", "server.js"]
