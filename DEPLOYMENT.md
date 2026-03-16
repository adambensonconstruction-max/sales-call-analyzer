# ============================================================================
# Sales Call Analyzer — Deployment Guide
# ============================================================================
# Production deployment instructions for all major platforms.
# 
# Table of Contents:
# 1. Supabase Production Settings
# 2. Backend Deployment (Railway/Render/VPS)
# 3. Frontend Deployment (Vercel/Netlify)
# 4. Environment Variables Reference
# 5. SSL/HTTPS Configuration
# 6. Monitoring & Alerting
# ============================================================================

---

## 1. Supabase Production Settings

### 1.1 Project Setup

1. Create new Supabase project at https://app.supabase.com
2. Choose region closest to your users
3. Note the project URL and anon key

### 1.2 Database Schema

```bash
# Option 1: Using Supabase CLI
supabase login
supabase link --project-ref your-project-ref
supabase db push

# Option 2: SQL Editor (Recommended for initial setup)
# 1. Open Supabase Dashboard → SQL Editor
# 2. Copy contents of database_schema.sql
# 3. Run the SQL
```

### 1.3 Authentication Settings

**Dashboard → Authentication → Settings:**

```
Site URL: https://your-frontend-domain.com
Redirect URLs:
  - https://your-frontend-domain.com
  - https://your-frontend-domain.com/app
  - http://localhost:5173 (for local dev)

Email Auth:
  - Enable Email confirmations: ON (production)
  - Secure email change: ON
  - Confirm email address: ON

External OAuth (optional):
  - Google: Enable for easy signup
  - Configure OAuth credentials
```

### 1.4 Row Level Security (RLS)

Verify RLS is enabled on all tables:

```sql
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- All tables should show 't' for rowsecurity
```

### 1.5 Storage Configuration

**Dashboard → Storage:**

1. Create bucket: `call-recordings`
2. Set to Private
3. Configure CORS:

```json
[
  {
    "origin": "https://your-frontend-domain.com",
    "methods": ["GET", "POST", "PUT", "DELETE"],
    "headers": ["Authorization", "Content-Type"]
  }
]
```

### 1.6 Database Backups

**Dashboard → Database → Backups:**

- Daily backups: Enabled (default)
- Point-in-time recovery: Enabled (Pro plan)
- Download backups before major changes

### 1.7 Connection Pooling (Recommended)

**Dashboard → Database → Connection Pooling:**

```
Mode: Transaction
Default Pool Size: 10
Max Client Conn: 100
```

Use connection pooler URL in production:
```
postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

---

## 2. Backend Deployment

### 2.1 Option A: Railway (Recommended)

**Prerequisites:**
- Railway account: https://railway.app
- GitHub repo with backend code

**Steps:**

1. **Create project:**
   ```bash
   railway login
   railway init
   ```

2. **Add environment variables:**
   ```bash
   railway variables set FLASK_ENV=production
   railway variables set FLASK_SECRET_KEY=$(openssl rand -hex 32)
   railway variables set SUPABASE_URL=https://your-project.supabase.co
   railway variables set SUPABASE_SERVICE_ROLE_KEY=your-service-key
   railway variables set OPENAI_API_KEY=your-openai-key
   railway variables set ASSEMBLYAI_API_KEY=your-assemblyai-key
   railway variables set CORS_ORIGINS=https://your-frontend.vercel.app
   ```

3. **Create Dockerfile:**
   ```dockerfile
   # backend/Dockerfile
   FROM python:3.11-slim

   WORKDIR /app

   # Install dependencies
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt

   # Copy application
   COPY . .

   # Run with gunicorn
   CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "main:app"]
   ```

4. **Deploy:**
   ```bash
   railway up
   ```

5. **Add custom domain (optional):**
   - Railway Dashboard → Settings → Domains
   - Add your domain
   - Configure DNS as instructed

### 2.2 Option B: Render

**Steps:**

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repo
4. Configure:
   ```
   Name: sales-call-analyzer-api
   Environment: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: gunicorn -w 4 -b 0.0.0.0:10000 main:app
   ```

5. Add environment variables in Render Dashboard
6. Deploy

### 2.3 Option C: VPS (Digital Ocean, AWS EC2, etc.)

**Server Requirements:**
- Ubuntu 22.04 LTS
- 2 vCPU, 4GB RAM minimum
- 20GB SSD storage

**Setup Script:**

```bash
#!/bin/bash
# run on server

# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3-pip python3-venv nginx supervisor

# Create app directory
sudo mkdir -p /var/www/sales-call-analyzer
sudo chown $USER:$USER /var/www/sales-call-analyzer

# Clone repo
cd /var/www/sales-call-analyzer
git clone https://github.com/yourusername/sales-call-analyzer.git .

# Setup Python environment
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create environment file
cat > .env << 'EOF'
FLASK_ENV=production
FLASK_SECRET_KEY=$(openssl rand -hex 32)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-key
OPENAI_API_KEY=your-openai-key
ASSEMBLYAI_API_KEY=your-assemblyai-key
CORS_ORIGINS=https://your-frontend-domain.com
EOF

# Setup supervisor
cat > /tmp/supervisor-sales-call.conf << 'EOF'
[program:sales-call-analyzer]
directory=/var/www/sales-call-analyzer/backend
command=/var/www/sales-call-analyzer/backend/venv/bin/gunicorn -w 4 -b 127.0.0.1:5000 main:app
autostart=true
autorestart=true
stderr_logfile=/var/log/sales-call-analyzer.err.log
stdout_logfile=/var/log/sales-call-analyzer.out.log
user=www-data
environment=PATH="/var/www/sales-call-analyzer/backend/venv/bin"
EOF

sudo mv /tmp/supervisor-sales-call.conf /etc/supervisor/conf.d/
sudo supervisorctl reread
sudo supervisorctl update

# Setup Nginx
cat > /tmp/nginx-sales-call << 'EOF'
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

sudo mv /tmp/nginx-sales-call /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/nginx-sales-call /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL (Certbot)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

---

## 3. Frontend Deployment

### 3.1 Option A: Vercel (Recommended)

**Steps:**

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Configure build settings:
   ```json
   // frontend/vercel.json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "framework": "vite",
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ],
     "headers": [
       {
         "source": "/(.*)",
         "headers": [
           { "key": "X-Frame-Options", "value": "DENY" },
           { "key": "X-Content-Type-Options", "value": "nosniff" },
           { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
         ]
       }
     ]
   }
   ```

3. Set environment variables:
   ```bash
   cd frontend
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   vercel env add VITE_API_URL
   ```

4. Deploy:
   ```bash
   vercel --prod
   ```

### 3.2 Option B: Netlify

**Steps:**

1. Create `netlify.toml`:
   ```toml
   [build]
     command = "npm run build"
     publish = "dist"

   [[redirects]]
     from = "/api/*"
     to = "https://your-api-domain.com/api/:splat"
     status = 200

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200

   [context.production.environment]
     VITE_SUPABASE_URL = "https://your-project.supabase.co"
     VITE_SUPABASE_ANON_KEY = "your-anon-key"
     VITE_API_URL = "https://your-api-domain.com/api/v1"
   ```

2. Connect repo to Netlify
3. Deploy

### 3.3 Option C: Cloudflare Pages

**Steps:**

1. Connect GitHub repo to Cloudflare Pages
2. Build settings:
   ```
   Framework preset: None
   Build command: npm run build
   Build output directory: dist
   Root directory: frontend
   ```

3. Add environment variables in Cloudflare Dashboard

---

## 4. Environment Variables Reference

### Backend Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `FLASK_ENV` | Yes | Environment mode | `production` |
| `FLASK_SECRET_KEY` | Yes | Flask secret (generate random) | `hex-string-64-chars` |
| `SUPABASE_URL` | Yes | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (keep secret!) | `eyJ...` |
| `SUPABASE_JWT_SECRET` | Yes | JWT secret for token verification | `your-jwt-secret` |
| `OPENAI_API_KEY` | Yes | OpenAI API key | `sk-...` |
| `ASSEMBLYAI_API_KEY` | Yes | AssemblyAI API key | `xxx...` |
| `DEEPGRAM_API_KEY` | No | Deepgram API key (live transcription) | `xxx...` |
| `CORS_ORIGINS` | Yes | Allowed frontend origins | `https://app.example.com` |
| `RATE_LIMIT_ENABLED` | No | Enable rate limiting | `true` |
| `SENTRY_DSN` | No | Sentry error tracking URL | `https://...@sentry.io/...` |
| `REDIS_URL` | No | Redis connection URL | `redis://localhost:6379` |

### Frontend Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon key (safe for frontend) | `eyJ...` |
| `VITE_API_URL` | Yes | Backend API base URL | `/api/v1` or full URL |

### Generating Secrets

```bash
# Flask secret key
openssl rand -hex 32

# JWT secret (if self-hosting)
openssl rand -base64 32
```

---

## 5. SSL/HTTPS Configuration

### 5.1 Certificate Setup

**Let's Encrypt (Free):**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal test
sudo certbot renew --dry-run
```

**Cloudflare (Recommended for CDN + SSL):**

1. Add site to Cloudflare
2. Set SSL/TLS mode to "Full (Strict)"
3. Enable "Always Use HTTPS"
4. Configure DNS records

### 5.2 Security Headers

Add to Nginx config:

```nginx
server {
    # ... existing config ...

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://*.supabase.co https://api.openai.com;" always;
    
    # HSTS (enable after confirming HTTPS works)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

### 5.3 CORS Configuration

Backend CORS must match your frontend domain:

```python
# config.py
CORS_ORIGINS = [
    "https://your-frontend-domain.com",
    "https://www.your-frontend-domain.com"
]
```

---

## 6. Monitoring & Alerting

### 6.1 Application Monitoring (Sentry)

**Setup:**

```bash
# Backend
pip install sentry-sdk[flask]

# Add to main.py
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration

sentry_sdk.init(
    dsn="your-sentry-dsn",
    integrations=[FlaskIntegration()],
    traces_sample_rate=0.1,
    profiles_sample_rate=0.1,
)
```

**Frontend:**
```bash
npm install @sentry/react @sentry/browser
```

```typescript
// main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: "your-sentry-dsn",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

### 6.2 Uptime Monitoring

**UptimeRobot (Free tier):**
- Monitor: `https://api.yourdomain.com/health`
- Check interval: 5 minutes
- Alert via email/Slack

**Pingdom / Better Uptime:**
- Multi-region monitoring
- Detailed response time tracking

### 6.3 Log Aggregation

**Supabase Logs:**
- Dashboard → Logs → API/Postgres
- Built-in log explorer

**Papertrail / LogDNA:**
```bash
# Forward logs from VPS
echo "*.* @logs.papertrailapp.com:XXXXX" | sudo tee -a /etc/rsyslog.conf
sudo service rsyslog restart
```

### 6.4 Performance Monitoring

**Supabase Dashboard:**
- Database performance
- API request metrics
- Storage usage

**Railway/Render Dashboard:**
- CPU/Memory usage
- Request latency
- Error rates

### 6.5 Health Checks

**Backend Health Endpoint:**
```bash
curl https://api.yourdomain.com/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "environment": "production"
}
```

**Database Health Check:**
```sql
-- Run periodically
SELECT 1;
```

### 6.6 Alerting Rules

**Recommended Alerts:**

| Condition | Severity | Action |
|-----------|----------|--------|
| API down > 2 min | Critical | Page/SMS |
| Error rate > 5% | Critical | Slack/Email |
| Response time > 2s | Warning | Slack |
| DB connections > 80% | Warning | Email |
| Storage > 80% | Warning | Email |
| Failed login attempts > 10/min | Warning | Email |

---

## 7. Production Checklist

Before going live:

- [ ] Database schema migrated to production Supabase
- [ ] RLS policies tested and verified
- [ ] All environment variables set correctly
- [ ] SSL certificates installed and auto-renewal configured
- [ ] CORS origins restricted to production domains
- [ ] Rate limiting enabled
- [ ] Sentry configured for error tracking
- [ ] Health check endpoint responding
- [ ] Uptime monitoring active
- [ ] Backup strategy confirmed
- [ ] Rollback plan documented
- [ ] Load testing completed (if expecting high traffic)
- [ ] Documentation updated

---

## 8. Troubleshooting

### Common Issues

**CORS Errors:**
```
Access to fetch at '...' from origin '...' has been blocked by CORS
```
→ Check `CORS_ORIGINS` includes your exact frontend URL

**Database Connection Errors:**
```
Connection refused / timeout
```
→ Check Supabase status, verify connection string, check firewall

**JWT Verification Failures:**
```
Invalid or expired token
```
→ Verify `SUPABASE_JWT_SECRET` matches Supabase project

**File Upload Failures:**
```
413 Payload Too Large
```
→ Increase `MAX_CONTENT_LENGTH` and web server limits

**Memory Issues:**
```
Worker timeout / Memory limit exceeded
```
→ Increase worker memory, add swap, or use external task queue

---

## 9. Scaling Considerations

### Horizontal Scaling

**Backend:**
- Use external Redis for rate limiting (shared state)
- Stateless design allows multiple instances
- Use load balancer (Railway/Render handle this)

**Database:**
- Supabase handles scaling automatically
- Consider read replicas for heavy analytics

**File Storage:**
- Supabase Storage scales automatically
- Consider CDN for global distribution

### Performance Optimization

1. **Enable CDN** (Cloudflare)
2. **Compress responses** (gzip/brotli)
3. **Cache static assets** (long TTL)
4. **Optimize images** (if any)
5. **Database indexing** (already in schema)
6. **Connection pooling** (use Supabase pooler)

---

## 10. Backup & Disaster Recovery

### Database Backups

**Automated (Supabase):**
- Daily backups retained for 7 days (Pro plan)
- Point-in-time recovery available

**Manual Export:**
```bash
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql
```

### Recovery Procedure

1. **Database corruption:**
   - Restore from Supabase backup
   - Or recreate from schema + data export

2. **Application failure:**
   - Rollback to previous deployment
   - Check logs for error cause

3. **Complete disaster:**
   - Redeploy application
   - Restore database from backup
   - Verify all integrations

---

*Last updated: 2026-03-15*
