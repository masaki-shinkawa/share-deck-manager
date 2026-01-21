# Development Dockerfile for FastAPI Backend
FROM python:alpine

# Set working directory
WORKDIR /app

# Install system dependencies
# Build dependencies for Python packages with native extensions
RUN apk add --no-cache \
    postgresql-client \
    bash \
    && apk add --no-cache --virtual .build-deps \
    gcc \
    musl-dev \
    libffi-dev \
    openssl-dev \
    postgresql-dev

# Copy requirements first for better layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt \
    && apk del .build-deps

# Create entrypoint script directly in Dockerfile to avoid line ending issues
RUN echo '#!/bin/bash' > /usr/local/bin/entrypoint.sh && \
    echo 'set -e' >> /usr/local/bin/entrypoint.sh && \
    echo 'echo "🚀 Starting backend entrypoint script..."' >> /usr/local/bin/entrypoint.sh && \
    echo 'DB_HOST=$(echo $DATABASE_URL | sed -n '"'"'s/.*@\(.*\):.*/\1/p'"'"')' >> /usr/local/bin/entrypoint.sh && \
    echo 'DB_PORT=$(echo $DATABASE_URL | sed -n '"'"'s/.*:\([0-9]*\)\/.*/\1/p'"'"')' >> /usr/local/bin/entrypoint.sh && \
    echo 'echo "⏳ Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."' >> /usr/local/bin/entrypoint.sh && \
    echo 'until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U postgres; do' >> /usr/local/bin/entrypoint.sh && \
    echo '  echo "PostgreSQL is unavailable - sleeping"' >> /usr/local/bin/entrypoint.sh && \
    echo '  sleep 2' >> /usr/local/bin/entrypoint.sh && \
    echo 'done' >> /usr/local/bin/entrypoint.sh && \
    echo 'echo "✅ PostgreSQL is up and running!"' >> /usr/local/bin/entrypoint.sh && \
    echo 'echo "🔄 Running Alembic migrations..."' >> /usr/local/bin/entrypoint.sh && \
    echo 'alembic upgrade head' >> /usr/local/bin/entrypoint.sh && \
    echo 'echo "✨ Migrations completed successfully!"' >> /usr/local/bin/entrypoint.sh && \
    echo 'echo "🎯 Starting application: $@"' >> /usr/local/bin/entrypoint.sh && \
    echo 'exec "$@"' >> /usr/local/bin/entrypoint.sh && \
    chmod +x /usr/local/bin/entrypoint.sh

# Copy application code (will be overridden by volume mount in development)
COPY . .

# Expose port
EXPOSE 8000

# Set entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Default command (can be overridden in docker-compose.yml)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
