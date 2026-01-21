#!/bin/bash
set -e

echo "🚀 Starting backend entrypoint script..."

# Extract database connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\(.*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

echo "⏳ Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."

# Wait for PostgreSQL to be ready
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U postgres; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "✅ PostgreSQL is up and running!"

# Run database migrations
echo "🔄 Running Alembic migrations..."
alembic upgrade head

echo "✨ Migrations completed successfully!"

# Execute the main command (passed as arguments)
echo "🎯 Starting application: $@"
exec "$@"
