# Railway Deployment Guide

## Quick Deploy

### 1. Backend (Flask API)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template-id)

Or manually:
1. Go to https://railway.app/
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repo
4. Add environment variables (see below)
5. Deploy!

### 2. Frontend (Static Site)

1. In Railway, click "New" → "Static Site"
2. Select your GitHub repo
3. Set build command: `cd refactor/frontend && npm install && npm run build`
4. Set publish directory: `refactor/frontend/dist`
5. Add environment variables
6. Deploy!

## Environment Variables

### Backend
```
SUPABASE_URL=https://dvxwwdwniqeqslisoknc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-...
ASSEMBLYAI_API_KEY=...
DEEPGRAM_API_KEY=...
FLASK_SECRET_KEY=random-secret-key
CORS_ORIGINS=https://your-frontend-url.up.railway.app
```

### Frontend
```
VITE_SUPABASE_URL=https://dvxwwdwniqeqslisoknc.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://your-backend-url.up.railway.app
```

## Alternative: Single Deploy with Docker

Use the included `docker-compose.yml` for local development or deploy to a VPS.
