# Sales Call Analyzer - Comprehensive Audit Report

**Project Location:** `/Users/adamben/.openclaw/workspace/projects/sales-call-analyzer`  
**Report Date:** March 15, 2026  
**Auditor:** AI Subagent Analysis

---

## 1. PROJECT STRUCTURE OVERVIEW

### Directory Structure
```
sales-call-analyzer/
├── app.py                    # Main Flask backend (~7,167 lines)
├── database.py               # Supabase database operations (~990 lines)
├── sales_analyzer.py         # AI sales analysis logic (~900 lines)
├── websocket_server.py       # WebSocket server for real-time features
├── pdf_generator.py          # PDF report generation
├── requirements.txt          # Python dependencies
├── .env.example              # Environment variables template
├── package.json              # Frontend dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React app (~3,000+ lines)
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx
│   │   │   └── LanguageContext.jsx
│   │   ├── pages/
│   │   │   ├── AIAgentPage.jsx
│   │   │   ├── LandingPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── LiveCallPage_OLD.jsx
│   │   │   └── AdminDashboard.jsx
│   │   └── lib/
│   │       └── translations.js  # i18n translations
│   ├── index.html
│   └── package.json
└── uploads/                  # Audio file uploads
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python Flask + Socket.IO |
| **Frontend** | React + Vite + Tailwind CSS |
| **Database** | Supabase (PostgreSQL) |
| **Storage** | Supabase Storage |
| **Auth** | Supabase Auth (JWT) |
| **AI/ML** | OpenAI GPT-4o, GPT-5.2, Whisper |
| **Transcription** | AssemblyAI, Deepgram |
| **PDF Generation** | ReportLab |

---

## 2. BACKEND ANALYSIS (app.py ~7,167 lines)

### 2.1 API Routes Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/debug/*` | GET/POST | Debug endpoints (jobs, keys, db, auth) |
| `/api/upload` | POST | Upload audio files |
| `/api/status/<job_id>` | GET | Check processing status |
| `/api/analyze/<call_id>` | POST | Analyze transcribed call |
| `/api/dashboard` | GET | Get user dashboard stats |
| `/api/calls` | GET | List user's calls |
| `/api/calls/<id>` | GET/DELETE | Get/delete specific call |
| `/api/calls/<id>/rename` | POST | Rename call |
| `/api/calls/<id>/generate-name` | POST | AI-generate call name |
| `/api/generate-practice` | POST | Generate practice recommendations |
| `/api/practice-feedback` | POST | Get practice feedback |
| `/api/practice-sessions/*` | GET/POST/PUT/DELETE | Practice session CRUD |
| `/api/roleplay/*` | POST | Roleplay simulation |
| `/api/transcribe-*` | POST | Various transcription endpoints |
| `/api/grammar/*` | POST | Grammar correction |
| `/api/story-bank/*` | GET/POST/PUT/DELETE | Story management |
| `/api/assistant` | POST | AI sales coach assistant |
| `/api/generate-pdf` | POST | Generate PDF report |
| `/api/export-calls-csv` | GET | Export calls to CSV |
| `/api/live/*` | GET/POST | Live call session management |
| `/api/ai-agent/*` | POST | Real-time AI coaching |
| `/api/sales-flows/*` | GET/POST/PUT/DELETE | Sales flow management |
| `/api/conversation-trees/*` | GET/POST/PUT/DELETE | Conversation tree management |
| `/api/mind-map/*` | GET/POST | Mind map features |
| `/api/user-scripts/*` | GET/POST/PUT/DELETE | User script management |

### 2.2 Security Issues

#### 🔴 CRITICAL: Debug Endpoints Expose Sensitive Information

**Location:** Lines 125-230

```python
@app.route('/api/debug/api-keys', methods=['GET'])
def debug_api_keys():
    """Debug endpoint to check API key configuration"""
    return jsonify({
        'assemblyai_configured': bool(ASSEMBLYAI_API_KEY),
        'assemblyai_key_preview': ASSEMBLYAI_API_KEY[:10] + '...' if ASSEMBLYAI_API_KEY else None,
        'openai_configured': bool(OPENAI_API_KEY),
        'openai_key_preview': OPENAI_API_KEY[:10] + '...' if OPENAI_API_KEY else None,
        # ...
    })
```

**Risk:** API key previews are exposed. While only first 10 chars are shown, this is unnecessary information disclosure.

**Recommendation:** Remove debug endpoints entirely or restrict to admin-only with proper authentication.

#### 🔴 CRITICAL: CORS Configuration Too Permissive

**Location:** Lines 79-88

```python
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    return response
```

**Risk:** Wildcard CORS allows any domain to make requests.

**Recommendation:** Restrict to specific origins:
```python
allowed_origins = ['http://localhost:5173', 'https://yourdomain.com']
```

#### 🟡 MEDIUM: JWT Token Extraction Issues

**Location:** Lines 38-53

```python
def get_user_id_from_token():
    auth_header = request.headers.get('Authorization', '')
    token = auth_header.replace('Bearer ', '') if auth_header.startswith('Bearer ') else None
    # ...
```

**Issue:** No validation that token is actually a valid JWT before processing.

#### 🟡 MEDIUM: File Upload Security

**Location:** Lines 233-270

**Issues:**
- No file size limit enforced in code (only in Supabase)
- No virus scanning
- File type validation only by extension
- Files saved to local filesystem before processing

### 2.3 Code Smells & Refactoring Needs

#### 🔴 CRITICAL: Monolithic File (7,167 lines)

**Issue:** `app.py` is extremely large and violates single responsibility principle.

**Recommendation:** Split into modules:
```
routes/
├── __init__.py
├── auth.py          # Authentication routes
├── calls.py         # Call management
├── analysis.py      # Analysis endpoints
├── practice.py      # Practice/roleplay
├── live.py          # Live coaching
├── flows.py         # Sales flows
├── trees.py         # Conversation trees
└── admin.py         # Admin endpoints
```

#### 🔴 CRITICAL: Duplicate Code Patterns

**Pattern 1:** Authentication check repeated in every route:
```python
user_id = get_user_id_from_token()
if not user_id:
    return jsonify({'error': 'Authentication required'}), 401
```

**Recommendation:** Use Flask decorators:
```python
@require_auth
def protected_route(user_id):
    # user_id passed automatically
    pass
```

**Pattern 2:** Database client check repeated:
```python
client = get_supabase()
if not client:
    return jsonify({'error': 'Database not available'}), 500
```

#### 🟡 MEDIUM: Hardcoded Model Names

**Location:** Multiple places

```python
model="gpt-5.2"  # Line 3030
model="gpt-4o-mini"  # Line 3573
model="gpt-4o"  # Line 3845
model="gpt-4.1"  # Line 6737
```

**Issue:** Model names scattered throughout code. If OpenAI deprecates a model, changes needed everywhere.

**Recommendation:** Centralize in config:
```python
# config.py
OPENAI_MODELS = {
    'analysis': 'gpt-4o',
    'fast': 'gpt-4o-mini',
    'latest': 'gpt-5.2'
}
```

#### 🟡 MEDIUM: String-based SQL/NoSQL Queries

**Issue:** Direct table names and column names as strings throughout.

**Recommendation:** Use ORM or query builder for type safety.

### 2.4 Error Handling Patterns

#### ✅ Good Patterns:
- Try-except blocks around database operations
- Error logging with `print()` statements
- Stack traces printed in development

#### 🟡 Issues:
- Generic error messages returned to client
- No structured error response format
- Some endpoints return 500 without specific error details

---

## 3. FRONTEND ANALYSIS (App.jsx)

### 3.1 Component Organization Issues

#### 🔴 CRITICAL: Monolithic Component (~3,000+ lines)

**Issue:** `MainApp` component contains:
- 15+ different state variables
- Multiple view renderers
- Business logic mixed with presentation
- API calls embedded in component

**Recommendation:** Split into feature-based components:
```
src/
├── components/
│   ├── Dashboard/
│   │   ├── index.jsx
│   │   ├── StatsCard.jsx
│   │   ├── ScoreChart.jsx
│   │   └── TeamComparison.jsx
│   ├── Calls/
│   ├── Upload/
│   ├── Analysis/
│   └── Practice/
├── hooks/
│   ├── useCalls.js
│   ├── useAnalysis.js
│   └── useDashboard.js
└── services/
    ├── api.js
    └── auth.js
```

### 3.2 State Management Issues

#### 🔴 CRITICAL: Excessive State in Single Component

**Location:** MainApp component

```javascript
// Dashboard state
const [dashboardStats, setDashboardStats] = useState(null)
const [dashboardLoading, setDashboardLoading] = useState(false)
const [teamComparison, setTeamComparison] = useState(null)

// Calls state
const [callsList, setCallsList] = useState([])
const [callsLoading, setCallsLoading] = useState(false)
const [selectedCall, setSelectedCall] = useState(null)
const [callsSearch, setCallsSearch] = useState('')
const [callsFilter, setCallsFilter] = useState('all')
const [selectedCalls, setSelectedCalls] = useState([])
const [bulkMode, setBulkMode] = useState(false)

// Upload state
const [file, setFile] = useState(null)
const [loading, setLoading] = useState(false)
const [result, setResult] = useState(null)
const [error, setError] = useState(null)
const [progress, setProgress] = useState(0)
// ... 15+ more state variables
```

**Recommendation:** Use React Context or state management library (Zustand/Redux).

### 3.3 Performance Concerns

#### 🟡 MEDIUM: No Memoization

**Issue:** Complex calculations and filtered lists recalculated on every render:
```javascript
const filteredCalls = callsList.filter(call => {
  // This runs on EVERY render
})
```

**Recommendation:** Use `useMemo`:
```javascript
const filteredCalls = useMemo(() => 
  callsList.filter(call => /* ... */),
  [callsList, callsSearch, callsFilter]
)
```

#### 🟡 MEDIUM: Inline Function Definitions

**Issue:** Functions defined inline in render cause child re-renders:
```javascript
<button onClick={() => setActiveTab('dashboard')}>
```

### 3.4 UI/UX Improvement Opportunities

1. **Loading States:** Inconsistent loading indicators across views
2. **Error Handling:** Generic error messages, no retry mechanisms
3. **Accessibility:** Missing ARIA labels, keyboard navigation
4. **Mobile Responsiveness:** Some components lack mobile optimization
5. **Empty States:** Could be more engaging with actionable CTAs

---

## 4. DATABASE & SUPABASE INTEGRATION

### 4.1 Schema Overview

**Tables Identified:**
- `calls` - Call records
- `analyses` - Analysis results
- `user_roles` - User role management
- `live_sessions` - Live coaching sessions
- `live_insights` - Real-time coaching insights
- `live_transcript_chunks` - Live transcript segments
- `sales_flows` - Sales flow templates
- `flow_nodes` - Flow node definitions
- `node_content` - Content for flow nodes
- `conversation_trees` - Conversation trees
- `tree_nodes` - Tree node data
- `node_edges` - Tree edge relationships
- `tree_node_content` - Content for tree nodes
- `tree_practice_sessions` - Practice session tracking
- `flow_simulations` - Simulation data
- `mind_map_categories` - Mind map categories
- `mind_map_nodes` - Mind map nodes
- `user_scripts` - User saved scripts
- `story_bank` - Story storage

### 4.2 Query Efficiency Issues

#### 🟡 MEDIUM: N+1 Query Pattern

**Location:** `database.py` lines 350-380

```python
for user in users_info.data:
    stats = get_user_stats(user_id)  # Separate query per user
```

**Recommendation:** Use Supabase's `rpc` for complex aggregations or batch queries.

#### 🟡 MEDIUM: No Pagination

**Issue:** Multiple queries lack pagination:
```python
result = client.table('calls').select('*').eq('user_id', user_id).order('created_at', desc=True).limit(50).execute()
```

While there's a limit, there's no cursor-based pagination for large datasets.

### 4.3 Missing Indexes

**Potential Missing Indexes:**
- `calls(user_id, created_at)` - For user's call list
- `analyses(call_id)` - For analysis lookups
- `live_sessions(user_id, status)` - For active session queries
- `conversation_trees(user_id, is_public)` - For tree listings

### 4.4 Data Model Issues

#### 🟡 MEDIUM: JSONB Overuse

**Issue:** Heavy use of JSONB columns for structured data:
```python
'utterances': utterances,  # JSONB
'speaker_roles': speaker_roles,  # JSONB
'metrics': metrics,  # JSONB
'analysis': analysis_data,  # JSONB
```

**Trade-off:** Flexibility vs. queryability. Cannot easily query inside these structures.

---

## 5. EXTERNAL DEPENDENCIES

### 5.1 AssemblyAI Integration

**Location:** Lines 109, 4500+

**Configuration:**
```python
ASSEMBLYAI_API_KEY = os.getenv('ASSEMBLYAI_API_KEY')
```

**Features Used:**
- Real-time streaming transcription
- Speaker diarization
- WebSocket connection

**Issues:**
- Fallback to API key exposure in `/api/live/assemblyai-token` endpoint
- No rate limiting implemented

### 5.2 OpenAI Integration

**Location:** Lines 115, 3000+

**Models Used:**
- `gpt-5.2` - Analysis
- `gpt-4o` - General tasks
- `gpt-4o-mini` - Fast/real-time
- `gpt-4.1` - Chat/coaching
- `whisper-1` - Transcription
- `tts-1`, `tts-1-hd` - Text-to-speech

**Issues:**
- No token usage tracking
- No rate limiting
- No retry logic for API failures
- Hardcoded model names

### 5.3 Deepgram Integration

**Location:** Lines 4600+

**Features:**
- Nova-2 model
- Speaker diarization
- Real-time streaming

### 5.4 Supabase Integration

**Location:** `database.py`

**Configuration:**
```python
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')
```

**Security Note:** Service key should NEVER be exposed to frontend.

### 5.5 Hardcoded Credentials Check

**Result:** ✅ No hardcoded credentials found in source code.

All API keys properly loaded from environment variables.

---

## 6. BUGS & ISSUES

### 6.1 Actual Bugs

#### 🔴 CRITICAL: Model Name Typo

**Location:** Line 3030

```python
model="gpt-5.2"  # This model doesn't exist as of March 2026
```

**Issue:** OpenAI's latest model is GPT-4o, not GPT-5.2. This will cause API errors.

**Fix:** Change to `gpt-4o` or `gpt-4-turbo`.

#### 🔴 CRITICAL: WebSocket Connection Memory Leak

**Location:** Lines 4500-4700

```python
streaming_connections = {}
streaming_connection_ready = {}

# Connections are stored but cleanup may not be complete
```

**Issue:** If clients disconnect unexpectedly, connections may not be properly cleaned up.

#### 🟡 MEDIUM: Race Condition in Analysis

**Location:** Lines 347-400

Multiple async processes can update the same analysis record simultaneously.

#### 🟡 MEDIUM: File Upload Race Condition

**Location:** Lines 233-270

Job status updates not atomic - could lead to inconsistent state.

### 6.2 Unfinished Code

#### 🟡 MEDIUM: TODO Comments (None Found)

Actually, no TODO/FIXME comments were found - which is concerning as it suggests either:
1. Code is complete (unlikely for a project this size)
2. TODOs were removed before audit
3. Issues are not documented

### 6.3 Broken Features

#### 🔴 CRITICAL: `get_template_tree` Function Returns Static Data

**Location:** Lines 6000-6500

```python
def get_template_tree(product_type, industry):
    """Generate a comprehensive branching tree..."""
    return {
        "name": f"{product_display} Sales Tree",
        # ... static Hebrew/English content
    }
```

**Issue:** Function claims to "generate" but returns hardcoded template regardless of inputs.

---

## 7. PERFORMANCE ISSUES

### 7.1 Large File Handling

**Current:**
- 50MB file size limit (hardcoded in `database.py` line 75)
- Files uploaded to memory then to Supabase
- No streaming upload

**Issues:**
- Memory pressure with large files
- No progress tracking for uploads
- Timeout risk with slow connections

### 7.2 Database Query Efficiency

**N+1 Queries:**
- User stats calculation
- Team comparison generation
- Call list with analysis data

### 7.3 Frontend Bundle Size

**Concerns:**
- Single large App.jsx component
- No code splitting identified
- All features loaded upfront

**Recommendation:** Implement React.lazy() for route-based code splitting.

### 7.4 Memory Leaks

**Potential Issues:**
1. WebSocket connections not cleaned up properly
2. Audio blob URLs not revoked
3. Event listeners not removed on unmount
4. setInterval/setTimeout not cleared

### 7.5 API Rate Limiting

**Issue:** No rate limiting on:
- OpenAI API calls
- AssemblyAI API calls
- Internal endpoints

**Risk:** Cost overruns and potential API bans.

---

## 8. RECOMMENDATIONS PRIORITY LIST

### 🔴 CRITICAL (Fix Immediately)

| # | Issue | File | Action |
|---|-------|------|--------|
| 1 | Remove or secure debug endpoints | app.py:125-230 | Add admin-only auth or remove |
| 2 | Fix CORS wildcard | app.py:79-88 | Restrict to known origins |
| 3 | Fix GPT-5.2 model name | app.py:3030 | Change to gpt-4o |
| 4 | Split monolithic app.py | app.py | Create routes/ directory |
| 5 | Fix WebSocket memory leak | app.py:4500+ | Implement proper cleanup |
| 6 | Add rate limiting | app.py | Implement Flask-Limiter |

### 🟡 HIGH (Fix Soon)

| # | Issue | File | Action |
|---|-------|------|--------|
| 7 | Split monolithic App.jsx | App.jsx | Component decomposition |
| 8 | Add authentication decorator | app.py | Reduce duplicate auth code |
| 9 | Implement proper pagination | database.py | Cursor-based pagination |
| 10 | Add database indexes | Supabase | Create performance indexes |
| 11 | Centralize model configuration | app.py | Config file for AI models |
| 12 | Add token usage tracking | app.py | Monitor OpenAI costs |
| 13 | Implement request validation | app.py | Use pydantic or marshmallow |
| 14 | Add proper error response format | app.py | Standardize API errors |
| 15 | Add file virus scanning | app.py | Integrate ClamAV or similar |

### 🟢 MEDIUM (Nice to Have)

| # | Issue | File | Action |
|---|-------|------|--------|
| 16 | Add React code splitting | frontend/ | Implement lazy loading |
| 17 | Add useMemo optimizations | App.jsx | Memoize expensive calculations |
| 18 | Implement proper ORM | database.py | Use SQLAlchemy or similar |
| 19 | Add API documentation | - | OpenAPI/Swagger spec |
| 20 | Add unit tests | - | pytest suite |
| 21 | Add E2E tests | - | Cypress or Playwright |
| 22 | Implement caching layer | - | Redis for frequent queries |
| 23 | Add monitoring/logging | - | Structured logging with Sentry |
| 24 | Accessibility improvements | frontend/ | ARIA labels, keyboard nav |
| 25 | Mobile responsiveness audit | frontend/ | Responsive design review |

---

## 9. SECURITY CHECKLIST

- [x] No hardcoded credentials
- [ ] Debug endpoints secured
- [ ] CORS restricted
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] File upload restrictions (size, type)
- [ ] SQL injection protection (parameterized queries)
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Secure session management
- [ ] HTTPS enforcement
- [ ] Security headers (HSTS, CSP, etc.)

---

## 10. SUMMARY

### Strengths
1. **Feature-rich:** Comprehensive sales coaching platform
2. **Good AI integration:** Multiple AI providers for redundancy
3. **Bilingual support:** Hebrew and English
4. **Real-time features:** Live coaching with WebSocket
5. **Modern stack:** React, Flask, Supabase

### Weaknesses
1. **Monolithic architecture:** Both frontend and backend need decomposition
2. **Security gaps:** Debug endpoints, CORS, rate limiting
3. **Performance issues:** N+1 queries, no pagination, memory leaks
4. **Code quality:** Duplicate code, hardcoded values, inconsistent patterns
5. **Testing:** No visible test suite

### Overall Assessment
The project is a feature-rich sales coaching platform with solid AI integration but suffers from architectural debt. The monolithic structure makes maintenance difficult and introduces performance and security risks. Prioritize splitting the codebase and securing endpoints before scaling.

**Estimated Effort to Address Critical Issues:** 2-3 weeks  
**Estimated Effort for Full Refactor:** 6-8 weeks

---

*End of Report*
