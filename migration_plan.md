# Migration Plan — Sales Call Analyzer v2

## Overview

This plan covers setting up the new Supabase project, running the schema migration, optionally migrating data from the old project, and validating everything works.

**New Supabase Project:** `dvxwwdwniqeqslisoknc.supabase.co`  
**Config file:** `.env.new`

---

## Phase 1: Supabase Project Setup

### 1.1 Initialize Supabase CLI (optional but recommended)

```bash
# Install Supabase CLI if not present
npm install -g supabase

# Link to the new project
cd sales-call-analyzer
supabase init   # creates supabase/ directory
supabase link --project-ref dvxwwdwniqeqslisoknc
```

### 1.2 Configure Auth Settings

In Supabase Dashboard → Authentication → Settings:

1. **Email auth** — Enable (primary method)
2. **Confirm email** — Enable for production, disable for dev
3. **JWT expiry** — 3600 seconds (1 hour)
4. **Refresh token rotation** — Enable
5. **Password min length** — 8 characters
6. **Site URL** — Set to your frontend URL
7. **Redirect URLs** — Add `http://localhost:5173`, production domain

### 1.3 Enable Required Extensions

Go to Dashboard → Database → Extensions and enable:
- `uuid-ossp` (UUID generation)
- `pgcrypto` (if not already enabled)

These are also created by the schema SQL, but enabling via dashboard ensures no permission issues.

---

## Phase 2: Run Database Schema

### 2.1 Execute the Schema

**Option A: Supabase Dashboard (recommended for first run)**

1. Go to Dashboard → SQL Editor → New Query
2. Paste the entire contents of `refactor/database_schema.sql`
3. Click **Run**
4. Verify no errors in the output

**Option B: Supabase CLI**

```bash
# Copy schema to migration
cp refactor/database_schema.sql supabase/migrations/20260315000000_initial_schema.sql

# Push to remote
supabase db push
```

### 2.2 Verify Schema

Run this verification query in the SQL Editor:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Expected: 18 tables
-- analyses, calls, conversation_trees, flow_nodes, live_insights,
-- live_sessions, live_transcript_chunks, mind_maps, practice_sessions,
-- processing_jobs, profiles, sales_flows, stories, teams,
-- transcript_segments, tree_edges, tree_nodes, user_scripts

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
-- All should show rowsecurity = true

-- Check enums
SELECT typname FROM pg_type 
WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND typtype = 'e';
-- Expected: call_status, speaker_role, practice_type, practice_difficulty,
--           user_role, live_session_status, transcription_provider, story_category

-- Check storage bucket
SELECT * FROM storage.buckets WHERE id = 'call-recordings';
```

### 2.3 Test Auth Trigger

1. Create a test user via Dashboard → Authentication → Users → Create User
2. Check that a row was automatically created in `public.profiles`
3. Delete the test user

---

## Phase 3: Data Migration (from old project)

> **Skip this phase** if starting fresh with no existing data to preserve.

### 3.1 Assess Old Data

Connect to the **old** Supabase project and inventory:

```sql
-- Count records in each table
SELECT 'calls' as tbl, count(*) FROM calls
UNION ALL SELECT 'analyses', count(*) FROM analyses
UNION ALL SELECT 'live_sessions', count(*) FROM live_sessions
-- ... add other tables
ORDER BY tbl;
```

### 3.2 Export from Old Project

```bash
# Export via Supabase CLI (old project)
supabase db dump --data-only -f old_data.sql

# Or export specific tables as CSV via dashboard:
# Dashboard → Table Editor → [table] → Export as CSV
```

### 3.3 Data Transformation

The old schema uses JSONB blobs for transcript data. The new schema normalizes this into `transcript_segments`. Write a migration script:

```python
# scripts/migrate_data.py
"""
Transforms old data format to new schema.
Run locally — reads from old Supabase, writes to new.
"""
import os
from supabase import create_client

OLD_URL = os.getenv('OLD_SUPABASE_URL')
OLD_KEY = os.getenv('OLD_SUPABASE_SERVICE_KEY')
NEW_URL = os.getenv('SUPABASE_URL')
NEW_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

old_client = create_client(OLD_URL, OLD_KEY)
new_client = create_client(NEW_URL, NEW_KEY)

def migrate_users():
    """Profiles are created via auth trigger — just ensure auth users exist."""
    # Users need to re-register or be batch-created via admin API
    pass

def migrate_calls():
    """Migrate calls table — map old columns to new."""
    old_calls = old_client.table('calls').select('*').execute()
    for call in old_calls.data:
        new_call = {
            'id': call['id'],
            'user_id': call['user_id'],
            'name': call.get('name') or call.get('title'),
            'status': 'completed',  # old calls are already processed
            'duration_secs': call.get('duration'),
            'file_path': call.get('file_path'),
            'language': call.get('language', 'en'),
            'created_at': call['created_at'],
        }
        new_client.table('calls').upsert(new_call).execute()
        
        # Extract utterances from JSONB into normalized segments
        utterances = call.get('utterances', [])
        if utterances:
            segments = []
            for i, utt in enumerate(utterances):
                segments.append({
                    'call_id': call['id'],
                    'speaker_label': utt.get('speaker', 'unknown'),
                    'speaker_role': map_speaker_role(utt.get('speaker_role')),
                    'text': utt['text'],
                    'start_ms': utt.get('start', 0),
                    'end_ms': utt.get('end', 0),
                    'confidence': utt.get('confidence'),
                    'seq': i,
                })
            # Batch insert (chunks of 100)
            for chunk in batch(segments, 100):
                new_client.table('transcript_segments').insert(chunk).execute()

def migrate_analyses():
    """Map old JSONB analysis blobs to structured columns."""
    old_analyses = old_client.table('analyses').select('*').execute()
    for a in old_analyses.data:
        analysis_data = a.get('analysis', {})
        new_analysis = {
            'id': a['id'],
            'call_id': a['call_id'],
            'user_id': a['user_id'],
            'overall_score': extract_score(analysis_data, 'overall'),
            'discovery_score': extract_score(analysis_data, 'discovery'),
            'rapport_score': extract_score(analysis_data, 'rapport'),
            'objection_score': extract_score(analysis_data, 'objection'),
            'closing_score': extract_score(analysis_data, 'closing'),
            'storytelling_score': extract_score(analysis_data, 'storytelling'),
            'persuasion_score': extract_score(analysis_data, 'persuasion'),
            'summary': analysis_data.get('summary'),
            'strengths': analysis_data.get('strengths', []),
            'improvements': analysis_data.get('improvements', []),
            'objections_detected': analysis_data.get('objections', []),
            'raw_ai_response': analysis_data,
            'created_at': a['created_at'],
        }
        new_client.table('analyses').upsert(new_analysis).execute()

def migrate_stories():
    """Migrate story bank."""
    old_stories = old_client.table('story_bank').select('*').execute()
    for s in old_stories.data:
        new_story = {
            'id': s['id'],
            'user_id': s['user_id'],
            'title': s.get('title', 'Untitled'),
            'content': s['content'],
            'category': map_story_category(s.get('category')),
            'tags': s.get('tags', []),
            'created_at': s['created_at'],
        }
        new_client.table('stories').upsert(new_story).execute()

# Helper functions
def map_speaker_role(role):
    mapping = {'seller': 'seller', 'buyer': 'buyer', 'sales': 'seller', 'client': 'buyer'}
    return mapping.get(str(role).lower(), 'unknown')

def map_story_category(cat):
    valid = {'success','objection_overcome','rapport_building','closing','discovery','pain_point','custom'}
    return cat if cat in valid else 'custom'

def extract_score(data, key):
    score = data.get(f'{key}_score') or data.get(key, {}).get('score')
    if score is not None:
        return max(0, min(100, int(score)))
    return None

def batch(lst, n):
    for i in range(0, len(lst), n):
        yield lst[i:i+n]

if __name__ == '__main__':
    print("Migrating users...")
    migrate_users()
    print("Migrating calls + transcripts...")
    migrate_calls()
    print("Migrating analyses...")
    migrate_analyses()
    print("Migrating stories...")
    migrate_stories()
    print("Migration complete!")
```

### 3.4 Migrate Storage Files

```bash
# Download from old bucket
supabase storage cp -r sb://call-recordings/ ./backup_recordings/ \
  --project-ref OLD_PROJECT_REF

# Upload to new bucket  
supabase storage cp -r ./backup_recordings/ sb://call-recordings/ \
  --project-ref dvxwwdwniqeqslisoknc
```

---

## Phase 4: Backend Setup

### 4.1 Create New Backend Structure

```bash
cd sales-call-analyzer

# Create the directory structure from backend_architecture.md
mkdir -p backend/{routes,services,models,providers,middleware,utils,tasks,tests}

# Create __init__.py files
find backend -type d -exec touch {}/__init__.py \;

# Copy .env.new to .env
cp .env.new backend/.env
```

### 4.2 Install Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate

pip install \
  flask \
  flask-cors \
  flask-limiter \
  flask-socketio \
  gunicorn \
  gevent-websocket \
  supabase \
  openai \
  assemblyai \
  deepgram-sdk \
  pydantic \
  tenacity \
  python-dotenv \
  reportlab \
  pytest \
  httpx

pip freeze > requirements.txt
```

### 4.3 Implement Core Modules (Priority Order)

1. `config.py` — Environment and settings
2. `providers/supabase_client.py` — Database connection
3. `middleware/auth.py` — Auth decorator
4. `middleware/error_handler.py` — Error handling
5. `routes/health.py` — Health check endpoint
6. `app.py` — App factory
7. **Test the skeleton runs** before adding features

Then build features in dependency order:
1. Auth + Profiles
2. Calls + Upload
3. Transcription
4. Analysis
5. Dashboard
6. Practice + Stories
7. Live coaching
8. Flows + Trees
9. Export

---

## Phase 5: Frontend Updates

### 5.1 Update API Client

```javascript
// src/services/api.js
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Update all endpoint paths to use /api/v1 prefix
// Update response handling to use new envelope format:
// { data: ..., meta: ... } instead of raw objects
```

### 5.2 Update Supabase Client

```javascript
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,     // new project URL
  import.meta.env.VITE_SUPABASE_ANON_KEY  // new anon key
);
```

### 5.3 Update Environment Variables

```bash
# frontend/.env
VITE_SUPABASE_URL=https://dvxwwdwniqeqslisoknc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=http://localhost:5000/api/v1
```

---

## Phase 6: Testing & Validation

### 6.1 Database Tests

```sql
-- Test RLS: attempt to read another user's calls (should return 0)
-- Run as authenticated user via Supabase client

-- Test auto-profile creation
-- Create user → verify profiles row exists

-- Test cascade deletes
-- Delete a call → verify transcript_segments and analyses are deleted

-- Test dashboard function
SELECT public.get_dashboard_stats('some-user-uuid');
```

### 6.2 API Smoke Tests

```bash
# Health check
curl http://localhost:5000/api/v1/health

# Auth flow
curl -X POST http://localhost:5000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'

# Upload (with auth)
curl -X POST http://localhost:5000/api/v1/calls \
  -H "Authorization: Bearer <token>" \
  -F "file=@test_recording.mp3"

# List calls
curl http://localhost:5000/api/v1/calls \
  -H "Authorization: Bearer <token>"
```

### 6.3 Integration Test Checklist

- [ ] User signup creates profile row
- [ ] Audio upload saves to Storage and creates call record
- [ ] Transcription completes and segments are stored
- [ ] Analysis completes with scores
- [ ] Dashboard returns correct aggregations
- [ ] Practice session creates and stores messages
- [ ] Story CRUD works with categories
- [ ] RLS prevents cross-user data access
- [ ] Rate limiting returns 429 when exceeded
- [ ] File size limit rejects oversized uploads
- [ ] Invalid auth returns 401
- [ ] Manager can view team data
- [ ] Admin can access all data

### 6.4 Performance Validation

```sql
-- Verify indexes are being used
EXPLAIN ANALYZE SELECT * FROM calls WHERE user_id = 'some-uuid' ORDER BY created_at DESC LIMIT 20;
EXPLAIN ANALYZE SELECT * FROM transcript_segments WHERE call_id = 'some-uuid' ORDER BY seq;
EXPLAIN ANALYZE SELECT * FROM analyses WHERE user_id = 'some-uuid' ORDER BY created_at DESC LIMIT 20;
```

---

## Phase 7: Go Live

### 7.1 Pre-Launch Checklist

- [ ] All environment variables set in production
- [ ] `FLASK_ENV=production`
- [ ] `FLASK_SECRET_KEY` is a strong random value
- [ ] CORS origins updated to production domain
- [ ] Rate limiting enabled
- [ ] Debug endpoints removed
- [ ] Supabase Dashboard: disable public schema access for anon role (if needed)
- [ ] Supabase Dashboard: enable email confirmation
- [ ] SSL/HTTPS configured on deployment platform
- [ ] Error monitoring configured (Sentry recommended)

### 7.2 Rollback Plan

If issues arise after go-live:

1. **Frontend:** Revert `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to old project
2. **Backend:** Revert `.env` to old Supabase credentials
3. **Data:** Old project remains untouched — no data loss risk

### 7.3 Decommission Old Project

Only after 2+ weeks of stable operation on the new project:

1. Export final data backup from old project
2. Disable old project's API keys
3. Archive old project (don't delete — keep for reference)

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|-------------|
| Phase 1: Supabase Setup | 30 min | None |
| Phase 2: Schema Migration | 30 min | Phase 1 |
| Phase 3: Data Migration | 2-4 hours | Phase 2 |
| Phase 4: Backend Setup | 3-5 days | Phase 2 |
| Phase 5: Frontend Updates | 1-2 days | Phase 4 |
| Phase 6: Testing | 2-3 days | Phase 4+5 |
| Phase 7: Go Live | 1 day | Phase 6 |

**Total estimated time: 1–2 weeks** (with a single developer)

---

## Files Reference

| File | Purpose |
|------|---------|
| `refactor/database_schema.sql` | Complete schema — run in Supabase SQL Editor |
| `refactor/backend_architecture.md` | Architecture design document |
| `refactor/migration_plan.md` | This file |
| `.env.new` | New project credentials |
