# Deployment Guide

## Sales Call Analyzer - Deployment Information

### Frontend Deployment (Netlify)

**Status:** ✅ Successfully deployed

| Property | Value |
|----------|-------|
| **Production URL** | https://sales-call-analyzer.netlify.app |
| **Site ID** | e0cd8170-0ecc-4c47-aebf-9fcb35b653d2 |
| **Build Command** | `npm run build` |
| **Publish Directory** | `frontend/dist` |
| **Node Version** | 20 |

#### Environment Variables (Frontend)

The following variables are configured in Netlify:

| Variable | Value | Purpose |
|----------|-------|---------|
| `VITE_SUPABASE_URL` | `https://dvxwwdwniqeqslisoknc.supabase.co` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | (set in Netlify dashboard) | Supabase public API key |
| `VITE_API_URL` | `https://your-backend-url.railway.app` | Backend API endpoint |

**Note:** The `VITE_API_URL` is currently set to a placeholder. Update this after deploying the backend.

#### Build Configuration

The `netlify.toml` file configures:
- Base directory: `frontend/`
- Build command: `npm run build`
- Publish directory: `dist/`
- SPA redirect rules (all routes → index.html)
- Node.js version 20

### Backend Deployment (Railway - Pending)

**Status:** ⏳ Not yet deployed

The backend is a Flask API server configured for Railway deployment.

#### Configuration Files

- `railway.json` - Railway deployment configuration
- `docker-compose.yml` - Local development with Docker
- `backend/Dockerfile` - Container configuration

#### Required Environment Variables (Backend)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key |
| `SUPABASE_JWT_SECRET` | ✅ | JWT secret for auth |
| `OPENAI_API_KEY` | ✅ | OpenAI API key |
| `ASSEMBLYAI_API_KEY` | ✅ | AssemblyAI transcription key |
| `DEEPGRAM_API_KEY` | ❌ | Deepgram (optional alternative) |
| `FLASK_SECRET_KEY` | ✅ | Flask session secret |
| `CORS_ORIGINS` | ✅ | Allowed CORS origins |

#### Deploying Backend to Railway

1. Push code to GitHub
2. Connect Railway to your GitHub repository
3. Add environment variables in Railway dashboard
4. Deploy

**After backend deployment:**
Update `VITE_API_URL` in Netlify environment variables with your Railway app URL.

### Recent Deployments

| Date | Deploy URL | Status |
|------|------------|--------|
| 2026-03-15 | https://69b77bb369a13f48b117ec07--sales-call-analyzer.netlify.app | ✅ Live |

### Build Logs

View detailed build logs at:
https://app.netlify.com/projects/sales-call-analyzer/deploys/69b77bb369a13f48b117ec07

### Local Development

```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
flask run
```
