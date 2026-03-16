# ============================================================================
# Sales Call Analyzer — Testing Checklist
# ============================================================================
# Complete testing guide for validating the application end-to-end.
# Run these tests before deploying to production.
# ============================================================================

## Quick Start Testing

```bash
# 1. Start the services
./setup.sh

# Or manually:
cd backend && source venv/bin/activate && python main.py
cd frontend && npm run dev

# 2. Run health check
curl http://localhost:5000/health
```

---

## 1. Database Connection Tests

### 1.1 Supabase Connection (Backend)

```bash
# Test Supabase connection via API
curl -X GET http://localhost:5000/health

# Expected response:
{
  "status": "healthy",
  "version": "2.0.0",
  "environment": "development"
}
```

### 1.2 Direct Database Query

```sql
-- Run in Supabase SQL Editor to verify schema
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';

-- Should return ~18 (number of tables in schema)
```

### 1.3 RLS Policy Verification

```sql
-- Verify RLS is enabled on critical tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('calls', 'analyses', 'profiles');

-- All should show 't' (true) for rowsecurity
```

---

## 2. API Endpoint Tests

### 2.1 Health Check

```bash
curl http://localhost:5000/health | jq
```

### 2.2 Authentication Required (Should Fail)

```bash
# Test without auth - should return 401
curl http://localhost:5000/api/v1/calls

# Expected: {"error": {"code": "UNAUTHORIZED", "message": "Missing or invalid authorization header"}}
```

### 2.3 Get Auth Token (via Supabase)

```bash
# Sign up via Supabase Auth API
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"

curl -X POST "${SUPABASE_URL}/auth/v1/signup" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }' | jq

# Store the access_token from response
```

### 2.4 Authenticated Calls List

```bash
ACCESS_TOKEN="your-access-token"

curl -X GET http://localhost:5000/api/v1/calls \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" | jq
```

### 2.5 Upload Call (with file)

```bash
# Create a test audio file first (or use existing)
ACCESS_TOKEN="your-access-token"

curl -X POST http://localhost:5000/api/v1/calls \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -F "file=@/path/to/test-audio.mp3" \
  -F "name=Test Sales Call" \
  -F "language=en" | jq
```

### 2.6 Get Call Details

```bash
CALL_ID="your-call-id"

curl -X GET "http://localhost:5000/api/v1/calls/${CALL_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" | jq
```

### 2.7 Get Transcript

```bash
curl -X GET "http://localhost:5000/api/v1/calls/${CALL_ID}/transcript" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" | jq
```

### 2.8 Get Analysis

```bash
curl -X GET "http://localhost:5000/api/v1/analysis/calls/${CALL_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" | jq
```

### 2.9 Trigger Analysis

```bash
curl -X POST "http://localhost:5000/api/v1/analysis/calls/${CALL_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" | jq
```

### 2.10 Get Dashboard Stats

```bash
curl -X GET http://localhost:5000/api/v1/dashboard \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" | jq
```

### 2.11 Delete Call

```bash
curl -X DELETE "http://localhost:5000/api/v1/calls/${CALL_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" | jq
```

---

## 3. Authentication Flow Tests

### 3.1 Sign Up Flow

1. Navigate to `http://localhost:5173/signup`
2. Enter email and password
3. Verify:
   - Form validation works (weak password rejected)
   - Success message shown
   - User redirected to `/app`
   - Profile created in database

### 3.2 Login Flow

1. Navigate to `http://localhost:5173/login`
2. Enter credentials
3. Verify:
   - Error shown for invalid credentials
   - Success redirects to `/app`
   - Session persisted on refresh

### 3.3 Logout Flow

1. Click logout in UI
2. Verify:
   - User redirected to `/`
   - Session cleared
   - Protected routes redirect to login

### 3.4 Token Refresh

1. Leave app open for extended period
2. Verify:
   - Token refreshes automatically
   - No auth errors during normal usage

### 3.5 Protected Routes

1. Visit `/app` while logged out
2. Verify redirect to `/login`
3. Login
4. Verify redirect back to `/app`

---

## 4. File Upload Tests

### 4.1 Valid Audio Upload

```bash
# Supported formats
curl -X POST http://localhost:5000/api/v1/calls \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -F "file=@test.mp3" -F "name=MP3 Test"

curl -X POST http://localhost:5000/api/v1/calls \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -F "file=@test.wav" -F "name=WAV Test"

curl -X POST http://localhost:5000/api/v1/calls \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -F "file=@test.m4a" -F "name=M4A Test"
```

### 4.2 Invalid File Rejection

```bash
# Should fail with validation error
curl -X POST http://localhost:5000/api/v1/calls \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -F "file@test.pdf" -F "name=Invalid Test"

# Expected: 400 Bad Request with validation error
```

### 4.3 Large File Handling

```bash
# Test 50MB+ file (should be rejected or handled gracefully)
# Create large test file
dd if=/dev/zero of=large_test.mp3 bs=1M count=60

curl -X POST http://localhost:5000/api/v1/calls \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -F "file=@large_test.mp3"
```

### 4.4 Upload Progress (Frontend)

1. Open browser DevTools → Network tab
2. Upload a large file
3. Verify:
   - Request shows progress
   - UI shows upload indicator
   - No timeout errors

---

## 5. Transcription Tests

### 5.1 Successful Transcription

1. Upload a clear audio file (2-5 minutes)
2. Verify status progression:
   - `uploading` → `transcribing` → `analyzing` → `completed`
3. Check transcript segments are created:

```bash
curl "http://localhost:5000/api/v1/calls/${CALL_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" | jq '.data.transcript_segments'
```

### 5.2 Speaker Diarization

1. Upload call with multiple speakers
2. Verify:
   - Different speaker labels (A, B, C...)
   - Speaker roles can be assigned

### 5.3 Language Support

```bash
# Test Hebrew transcription
curl -X POST http://localhost:5000/api/v1/calls \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -F "file=@hebrew_test.mp3" \
  -F "language=he"
```

### 5.4 Failed Transcription Handling

1. Upload corrupted audio file
2. Verify:
   - Status changes to `failed`
   - Error message populated
   - User can retry

---

## 6. Analysis Generation Tests

### 6.1 Complete Analysis

1. Wait for transcription to complete
2. Trigger analysis:

```bash
curl -X POST "http://localhost:5000/api/v1/analysis/calls/${CALL_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

3. Verify analysis fields populated:

```bash
curl "http://localhost:5000/api/v1/analysis/calls/${CALL_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" | jq '.data | keys'

# Should include:
# - overall_score
# - discovery_score
# - rapport_score
# - objection_score
# - closing_score
# - storytelling_score
# - persuasion_score
# - summary
# - strengths
# - improvements
# - objections_detected
# - talk_ratio
```

### 6.2 Score Range Validation

```bash
# Verify all scores are 0-100
curl "http://localhost:5000/api/v1/analysis/calls/${CALL_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" | jq '.data | 
  {
    overall: .overall_score,
    discovery: .discovery_score,
    rapport: .rapport_score,
    objection: .objection_score,
    closing: .closing_score,
    storytelling: .storytelling_score,
    persuasion: .persuasion_score
  }'
```

### 6.3 Re-analysis

```bash
# Force re-analysis
curl -X POST "http://localhost:5000/api/v1/analysis/calls/${CALL_ID}?force=true" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

---

## 7. Frontend Routing Tests

### 7.1 Route Navigation

| Route | Expected | Test |
|-------|----------|------|
| `/` | Landing page | ✓ |
| `/login` | Login form | ✓ |
| `/signup` | Signup form | ✓ |
| `/app` | Dashboard | ✓ (auth required) |
| `/app/calls` | Calls list | ✓ (auth required) |
| `/app/calls/:id` | Call detail | ✓ (auth required) |
| `/app/upload` | Upload page | ✓ (auth required) |
| `/app/practice` | Practice page | ✓ (auth required) |
| `/app/stories` | Stories page | ✓ (auth required) |
| `/app/settings` | Settings page | ✓ (auth required) |
| `/nonexistent` | 404 → redirect to `/` | ✓ |

### 7.2 Deep Linking

1. Copy URL: `http://localhost:5173/app/calls/123e4567-e89b-12d3-a456-426614174000`
2. Open in new tab
3. Verify:
   - If authenticated: loads call detail
   - If not authenticated: redirects to login, then to call detail

### 7.3 Browser Back/Forward

1. Navigate through multiple pages
2. Use browser back/forward buttons
3. Verify state is preserved correctly

---

## 8. Responsive Design Tests

### 8.1 Breakpoints

Test at these viewport sizes:

| Device | Width | Height |
|--------|-------|--------|
| Mobile S | 320px | 568px |
| Mobile M | 375px | 667px |
| Mobile L | 425px | 812px |
| Tablet | 768px | 1024px |
| Laptop | 1024px | 768px |
| Desktop | 1440px | 900px |
| Large Desktop | 1920px | 1080px |

### 8.2 Mobile-Specific Tests

1. **Navigation**
   - Hamburger menu opens/closes
   - Sidebar collapses properly
   - Touch targets are adequate size (min 44px)

2. **Upload Page**
   - Drag-and-drop area usable
   - File picker works
   - Progress indicator visible

3. **Call Detail**
   - Transcript scrolls properly
   - Scores visible without horizontal scroll
   - Tabs work on small screens

4. **Dashboard**
   - Charts resize correctly
   - Stats cards stack vertically
   - Recent calls list scrollable

### 8.3 Touch Interactions

1. Test on actual mobile device or simulator
2. Verify:
   - All buttons clickable
   - No hover-dependent features broken
   - Pinch-to-zoom works where appropriate

---

## 9. Critical Path Test

### Complete User Journey

```
1. Signup → Upload Call → Transcription → Analysis → View Results
```

**Step-by-step:**

1. **Signup** (`/signup`)
   - Create new account
   - Verify email if required
   - Land on dashboard

2. **Upload** (`/app/upload`)
   - Click upload button
   - Select audio file
   - Wait for upload to complete
   - Verify redirect to call detail

3. **Transcription** (Auto)
   - Watch status indicator
   - Verify "Transcribing..." appears
   - Wait for completion
   - Check transcript segments appear

4. **Analysis** (Auto or Manual)
   - If not auto: click "Analyze"
   - Watch "Analyzing..." indicator
   - Wait for scores to appear

5. **View Results** (`/app/calls/:id`)
   - Verify all scores displayed
   - Check summary text
   - Review strengths/improvements
   - Play audio (if player implemented)
   - Navigate transcript

---

## 10. Performance Tests

### 10.1 API Response Times

```bash
# Test API latency
curl -w "@curl-format.txt" -o /dev/null -s \
  http://localhost:5000/health

# curl-format.txt contents:
# time_namelookup: %{time_namelookup}\n
# time_connect: %{time_connect}\n
# time_appconnect: %{time_appconnect}\n
# time_pretransfer: %{time_pretransfer}\n
# time_redirect: %{time_redirect}\n
# time_starttransfer: %{time_starttransfer}\n
# time_total: %{time_total}\n
```

**Expected:**
- Health check: < 100ms
- Auth endpoints: < 200ms
- List calls: < 300ms
- Get call detail: < 300ms
- Upload: depends on file size
- Analysis: 5-30s (AI processing)

### 10.2 Frontend Load Performance

Use Lighthouse or PageSpeed Insights:

```bash
# Run Lighthouse CI
npx lighthouse http://localhost:5173 --output=json --output-path=report.json
```

**Targets:**
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.5s
- Cumulative Layout Shift: < 0.1

### 10.3 Bundle Size

```bash
cd frontend
npm run build

# Check bundle sizes
ls -lh dist/assets/*.js
```

**Targets:**
- Main bundle: < 200KB (gzipped)
- Vendor chunks: < 500KB (gzipped)
- Total initial load: < 1MB

---

## 11. Security Tests

### 11.1 CORS

```bash
# Test CORS preflight
curl -X OPTIONS http://localhost:5000/api/v1/calls \
  -H "Origin: http://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Should reject or not allow evil.com
```

### 11.2 SQL Injection

```bash
# Test SQL injection protection
curl "http://localhost:5000/api/v1/calls?id=1' OR '1'='1" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Should not return unauthorized data
```

### 11.3 XSS Prevention

1. Create call with name: `<script>alert('xss')</script>`
2. Verify script is not executed in browser
3. Check output is properly escaped

### 11.4 Rate Limiting

```bash
# Test rate limiting (default: 60/minute)
for i in {1..70}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    http://localhost:5000/health
done

# Should see 429 responses after limit
```

---

## 12. Error Handling Tests

### 12.1 Backend Errors

```bash
# 404 Not Found
curl "http://localhost:5000/api/v1/calls/nonexistent-id" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# 400 Bad Request
curl -X POST http://localhost:5000/api/v1/calls \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}'

# 401 Unauthorized
curl http://localhost:5000/api/v1/calls

# 403 Forbidden (if role-based)
# Create manager-only endpoint test
```

### 12.2 Frontend Error Boundaries

1. Trigger error in component
2. Verify error boundary catches it
3. Check error message is user-friendly
4. Verify reload option works

### 12.3 Network Failure Handling

1. Turn off backend
2. Try to use frontend
3. Verify:
   - Error messages shown
   - Retry options available
   - No infinite loading states

---

## Test Results Template

Copy this for tracking:

```markdown
## Test Run: YYYY-MM-DD

| Category | Tests | Passed | Failed | Notes |
|----------|-------|--------|--------|-------|
| Database | 3 | | | |
| API Endpoints | 11 | | | |
| Authentication | 5 | | | |
| File Upload | 4 | | | |
| Transcription | 4 | | | |
| Analysis | 3 | | | |
| Frontend Routing | 3 | | | |
| Responsive Design | 3 | | | |
| Critical Path | 1 | | | |
| Performance | 3 | | | |
| Security | 4 | | | |
| Error Handling | 3 | | | |

**Blockers:**
- 

**Notes:**
-
```

---

## Automated Testing (Future)

```bash
# Run backend tests
# cd backend && pytest

# Run frontend tests
# cd frontend && npm test

# Run E2E tests
# cd frontend && npx playwright test

# Run all tests
# ./run-tests.sh
```
