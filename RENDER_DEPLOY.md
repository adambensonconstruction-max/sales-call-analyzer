# Render Deployment Guide

## Backend Deployment

### 1. Create Web Service
1. Go to https://render.com/
2. Click "New" → "Web Service"
3. Connect your GitHub repo: `adambensonconstruction-max/sales-call-analyzer`

### 2. Configure Service
- **Name:** sales-call-analyzer-api
- **Environment:** Python 3
- **Build Command:** 
  ```
  pip install -r backend/requirements.txt
  ```
- **Start Command:**
  ```
  cd backend && gunicorn main:app --bind 0.0.0.0:$PORT --workers 4 --timeout 120
  ```

### 3. Environment Variables
Add these in Render Dashboard (copy from your .env file):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `ASSEMBLYAI_API_KEY`
- `DEEPGRAM_API_KEY`
- `FLASK_SECRET_KEY` (generate random string)
- `CORS_ORIGINS` (your frontend URL)
- `FLASK_ENV=production`

### 4. Deploy!
Click "Create Web Service" and Render will deploy automatically.

### 5. Update Frontend
After deployment, you'll get a URL like:
`https://sales-call-analyzer-api.onrender.com`

Update this in Netlify environment variables:
```
VITE_API_URL=https://sales-call-analyzer-api.onrender.com
```
