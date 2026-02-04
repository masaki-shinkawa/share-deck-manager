# Vercel Deployment Guide

## Overview

This guide explains how to deploy Share Deck Manager to Vercel with:
- **Frontend**: Next.js (Vercel native support)
- **Backend**: FastAPI (Vercel Python Serverless Functions)
- **Database**: Vercel Postgres

## Architecture

```
Vercel Platform
├── Next.js Frontend (frontend/)
├── FastAPI Backend (api/index.py → backend/app/)
│   └── Python Serverless Functions
│       └── 10 second execution limit (Hobby)
│       └── 60 second execution limit (Pro)
└── Vercel Postgres
```

## Deployment Steps

### 1. Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `.` (root)
   - **Build Command**: `cd frontend && npm run build`
   - **Output Directory**: `frontend/.next`
   - **Install Command**: `cd frontend && npm install`

### 2. Create Vercel Postgres Database

1. In Vercel Dashboard, go to "Storage"
2. Click "Create Database" → "Postgres"
3. Name your database (e.g., `share-deck-manager-db`)
4. Select region closest to your users
5. Connect to your project

Vercel will automatically add these environment variables:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

### 3. Configure Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables:

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection URL | `$POSTGRES_URL` (link to Vercel Postgres) |
| `NEXTAUTH_URL` | NextAuth.js base URL | `https://your-app.vercel.app` |
| `NEXTAUTH_SECRET` | JWT signing secret | Generate with `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | `GOCSPX-xxx` |
| `NEXT_PUBLIC_API_URL` | Public API URL | `https://your-app.vercel.app/api/v1` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `https://your-app.vercel.app` |

#### Optional Variables (Cloudflare R2)

| Variable | Description |
|----------|-------------|
| `R2_ENDPOINT_URL` | R2 endpoint URL |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_PUBLIC_URL` | R2 public URL |

### 4. Configure GitHub Secrets for Migrations

In GitHub → Repository → Settings → Secrets and variables → Actions:

| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | Same as Vercel's `POSTGRES_URL_NON_POOLING` |

### 5. Run Initial Migration

After deployment, run the migration workflow:

1. Go to GitHub → Actions → "Database Migration"
2. Click "Run workflow"
3. Select branch and run with default `upgrade head`

Or run manually:
```bash
cd backend
DATABASE_URL="your-postgres-url" alembic upgrade head
```

### 6. Update Google OAuth

In [Google Cloud Console](https://console.cloud.google.com/):

1. Go to APIs & Services → Credentials
2. Edit your OAuth 2.0 Client
3. Add Authorized redirect URIs:
   - `https://your-app.vercel.app/api/auth/callback/google`

## File Structure

```
share-deck-manager/
├── api/
│   └── index.py          # Vercel Serverless entry point
├── backend/
│   └── app/              # FastAPI application
├── frontend/
│   └── ...               # Next.js application
├── vercel.json           # Vercel configuration
├── requirements.txt      # Python dependencies for Vercel
└── .github/
    └── workflows/
        └── migrate.yml   # Migration CI/CD
```

## Limitations

### Vercel Serverless Functions (Hobby Plan)

| Limit | Value |
|-------|-------|
| Execution timeout | 10 seconds |
| Memory | 1024 MB |
| Payload size | 4.5 MB |
| Cold start | ~500ms - 2s |

### If Scraping Takes Too Long

If your scraping operations exceed 10 seconds:

**Option A: Upgrade to Pro ($20/month)**
- 60 second execution limit
- Better cold start times

**Option B: Split Backend**
- Keep frontend on Vercel
- Move FastAPI to Render/Fly.io (free tier available)
- Update `NEXT_PUBLIC_API_URL` to point to external backend

**Option C: Background Jobs**
- Use Vercel Cron Jobs for scheduled scraping
- Store results in database
- API returns cached results

## Troubleshooting

### Python Function Not Working

1. Check `vercel.json` has correct `functions` configuration
2. Verify `requirements.txt` is in root directory
3. Check Vercel deployment logs for Python errors

### Database Connection Issues

1. Ensure `DATABASE_URL` uses the pooling URL for serverless
2. Check Vercel Postgres is connected to your project
3. Verify migrations have run successfully

### CORS Errors

1. Check `ALLOWED_ORIGINS` includes your Vercel URL
2. Verify `vercel.json` headers are correct
3. Check browser console for specific CORS error

### Cold Start Issues

- First request after inactivity may be slow (1-2 seconds)
- Consider using Vercel's Edge Functions for latency-sensitive endpoints

## Monitoring

### Vercel Dashboard

- **Deployments**: View build logs and status
- **Functions**: Monitor serverless function invocations
- **Analytics**: View traffic and performance metrics

### Logs

```bash
# View function logs in Vercel Dashboard
Project → Logs → Filter by "api/index"
```

## Rollback

If something goes wrong:

1. Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"

## Local Development

To test Vercel configuration locally:

```bash
# Install Vercel CLI
npm i -g vercel

# Link to project
vercel link

# Pull environment variables
vercel env pull .env.local

# Run locally with Vercel
vercel dev
```
