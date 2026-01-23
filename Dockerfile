# ============================================================================
# MoodMelodies - Main Dockerfile
# ============================================================================
# This is a multi-stage Dockerfile that builds all backend services
# Use with: docker build -t moodmelodies-backend .
# 
# Individual services can still be built separately using their own Dockerfiles:
#   - signaling-server/Dockerfile
#   - translation-service/Dockerfile
#
# For development, use docker-compose in infrastructure/docker-compose.yml
# ============================================================================

# ------------ Stage 1: Signaling Server Builder ------------
FROM node:20-alpine AS signaling-builder

WORKDIR /app/signaling-server

# Copy package files for dependency caching
COPY signaling-server/package*.json ./
COPY signaling-server/tsconfig.json ./

# Install all dependencies (including dev for building)
RUN npm ci

# Copy source and prisma schema
COPY signaling-server/src ./src
COPY signaling-server/prisma ./prisma
COPY signaling-server/prisma.config.ts ./

# Generate Prisma client and build TypeScript
RUN npx prisma generate
RUN npm run build

# ------------ Stage 2: Translation Service Builder ------------
FROM python:3.11-slim AS translation-builder

WORKDIR /app/translation-service

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY translation-service/requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Copy source code
COPY translation-service/src ./src

# ------------ Stage 3: Signaling Server Runtime ------------
FROM node:20-alpine AS signaling-runtime

LABEL maintainer="MoodMelodies Team"
LABEL description="Signaling Server for MoodMelodies WebRTC"
LABEL version="1.0.0"

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy package files, prisma schema and install production dependencies only
COPY signaling-server/package*.json ./
COPY signaling-server/prisma ./prisma
RUN npm ci --only=production && npx prisma generate && npm cache clean --force

# Copy built files from builder
COPY --from=signaling-builder /app/signaling-server/dist ./dist

# Create directories and set permissions
RUN mkdir -p logs && chown -R node:node .

# Use non-root user for security
USER node

# Expose signaling server port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

CMD ["node", "dist/server.js"]

# ------------ Stage 4: Translation Service Runtime ------------
FROM python:3.11-slim AS translation-runtime

LABEL maintainer="MoodMelodies Team"
LABEL description="Translation Service for MoodMelodies"
LABEL version="1.0.0"

WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PORT=7777
ENV FLASK_ENV=production

# Install runtime dependencies only
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy Python packages from builder
COPY --from=translation-builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy source code
COPY --from=translation-builder /app/translation-service/src ./src
COPY translation-service/src/__init__.py ./src/__init__.py

# Create directories for models and logs
RUN mkdir -p models logs && chmod -R 755 models logs

# Expose translation service port
EXPOSE 7777

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:7777/health || exit 1

# Run with gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:7777", "--workers", "2", "--threads", "4", "--timeout", "120", "--graceful-timeout", "30", "src.app:app"]

# ------------ Stage 5: Full Backend (Combined) ------------
# This stage combines both services for simpler deployment
# Use this with a process manager like supervisord
FROM python:3.11-slim AS full-backend

LABEL maintainer="MoodMelodies Team"
LABEL description="MoodMelodies Full Backend (Signaling + Translation)"
LABEL version="1.0.0"

WORKDIR /app

# Install Node.js and system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    supervisor \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Set environment variables
ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# ------------ Setup Signaling Server ------------
WORKDIR /app/signaling-server

# Copy signaling server files
COPY signaling-server/package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=signaling-builder /app/signaling-server/dist ./dist
RUN mkdir -p logs

# ------------ Setup Translation Service ------------
WORKDIR /app/translation-service

# Copy Python packages
COPY --from=translation-builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy translation service source
COPY translation-service/src ./src
RUN mkdir -p models logs

# ------------ Supervisor Configuration ------------
WORKDIR /app

# Create supervisor configuration
RUN mkdir -p /var/log/supervisor
COPY <<EOF /etc/supervisor/conf.d/moodmelodies.conf
[supervisord]
nodaemon=true
logfile=/var/log/supervisor/supervisord.log
pidfile=/var/run/supervisord.pid
user=root

[program:signaling-server]
command=node /app/signaling-server/dist/server.js
directory=/app/signaling-server
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/signaling.err.log
stdout_logfile=/var/log/supervisor/signaling.out.log
environment=NODE_ENV="production",PORT="3000"

[program:translation-service]
command=gunicorn --bind 0.0.0.0:7777 --workers 2 --threads 4 --timeout 120 src.app:app
directory=/app/translation-service
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/translation.err.log
stdout_logfile=/var/log/supervisor/translation.out.log
environment=FLASK_ENV="production",PORT="7777"
EOF

# Expose both ports
EXPOSE 3000 7777

# Combined health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:3000/health && curl -f http://localhost:7777/health || exit 1

# Start supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/supervisord.conf"]
