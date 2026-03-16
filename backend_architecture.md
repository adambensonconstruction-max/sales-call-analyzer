# Backend Architecture — Sales Call Analyzer v2

## Overview

The refactored backend moves from a monolithic 7,000-line `app.py` to a modular Python service using **Flask blueprints**, clear service/route separation, and strong typing via **Pydantic**. The goal: every module is small enough to reason about in isolation.

---

## 1. Directory Structure

```
backend/
├── app.py                      # App factory — creates & configures Flask app
├── config.py                   # All env vars, model names, feature flags
├── wsgi.py                     # Gunicorn / production entry point
│
├── routes/                     # Flask Blueprints — thin HTTP layer
│   ├── __init__.py             # register_blueprints() helper
│   ├── auth.py                 # POST /auth/signup, /auth/login, /auth/refresh
│   ├── calls.py                # CRUD: /calls, /calls/:id, /calls/:id/rename
│   ├── upload.py               # POST /upload (multipart audio)
│   ├── transcription.py        # POST /transcribe/:call_id, status polling
│   ├── analysis.py             # POST /analyze/:call_id, GET /analysis/:id
│   ├── dashboard.py            # GET /dashboard, /dashboard/trends
│   ├── practice.py             # CRUD: /practice-sessions, /roleplay
│   ├── stories.py              # CRUD: /story-bank
│   ├── live.py                 # /live/start, /live/stop, /live/token
│   ├── flows.py                # CRUD: /sales-flows, /flow-nodes
│   ├── trees.py                # CRUD: /conversation-trees, /tree-nodes
│   ├── mind_maps.py            # CRUD: /mind-maps
│   ├── scripts.py              # CRUD: /user-scripts
│   ├── assistant.py            # POST /assistant (AI coach chat)
│   ├── export.py               # GET /export/pdf, /export/csv
│   └── health.py               # GET /health (no auth)
│
├── services/                   # Business logic — no HTTP awareness
│   ├── __init__.py
│   ├── auth_service.py         # Token verification, user lookup
│   ├── call_service.py         # Call CRUD, file management
│   ├── upload_service.py       # File validation, storage upload
│   ├── transcription_service.py # Orchestrates AssemblyAI / Deepgram / Whisper
│   ├── analysis_service.py     # Builds prompts, calls OpenAI, parses results
│   ├── dashboard_service.py    # Aggregation queries, caching
│   ├── practice_service.py     # Scenario generation, feedback
│   ├── story_service.py        # Story CRUD, search
│   ├── live_service.py         # WebSocket session management
│   ├── flow_service.py         # Flow & node operations
│   ├── tree_service.py         # Tree & node operations
│   ├── assistant_service.py    # AI coaching chat
│   ├── export_service.py       # PDF/CSV generation
│   └── scoring_service.py      # Score computation & normalization
│
├── models/                     # Pydantic schemas for request/response
│   ├── __init__.py
│   ├── call.py                 # CallCreate, CallResponse, CallListResponse
│   ├── analysis.py             # AnalysisResponse, ScoreBreakdown
│   ├── transcript.py           # TranscriptSegment, SpeakerAssignment
│   ├── practice.py             # PracticeCreate, PracticeResponse, Feedback
│   ├── story.py                # StoryCreate, StoryUpdate, StoryResponse
│   ├── dashboard.py            # DashboardStats, TrendPoint
│   ├── live.py                 # LiveSessionConfig, LiveChunk
│   ├── flow.py                 # FlowCreate, NodeCreate
│   ├── tree.py                 # TreeCreate, TreeNodeCreate
│   ├── assistant.py            # AssistantMessage, AssistantResponse
│   ├── common.py               # PaginatedResponse, ErrorResponse
│   └── user.py                 # UserProfile, UserUpdate
│
├── providers/                  # External API wrappers (easily swappable)
│   ├── __init__.py
│   ├── openai_provider.py      # Chat completions, embeddings, TTS
│   ├── assemblyai_provider.py  # Upload, transcribe, poll
│   ├── deepgram_provider.py    # Streaming transcription
│   └── supabase_client.py      # Singleton Supabase client + helpers
│
├── middleware/                  # Cross-cutting concerns
│   ├── __init__.py
│   ├── auth.py                 # @require_auth decorator + JWT verification
│   ├── rate_limiter.py         # Flask-Limiter config
│   ├── cors.py                 # CORS setup with allowed origins
│   ├── error_handler.py        # Global exception → JSON response mapping
│   └── request_logger.py       # Structured request logging
│
├── utils/                      # Pure utility functions
│   ├── __init__.py
│   ├── audio.py                # Duration detection, format validation
│   ├── pagination.py           # Cursor-based pagination helpers
│   ├── prompts.py              # All AI prompt templates (centralized)
│   └── validators.py           # File size, MIME type, UUID checks
│
├── tasks/                      # Background job processing
│   ├── __init__.py
│   ├── worker.py               # Task runner (Celery or simple thread pool)
│   ├── transcription_task.py   # Async transcription pipeline
│   └── analysis_task.py        # Async analysis pipeline
│
└── tests/                      # Test suite
    ├── conftest.py             # Fixtures, test client, mock Supabase
    ├── test_calls.py
    ├── test_analysis.py
    ├── test_upload.py
    ├── test_practice.py
    └── test_live.py
```

---

## 2. API Endpoint Design

All endpoints are prefixed with `/api/v1`. Responses follow a consistent envelope:

```json
// Success
{
  "data": { ... },
  "meta": { "page": 1, "per_page": 20, "total": 142 }
}

// Error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "File size exceeds 50MB limit",
    "details": { "max_bytes": 52428800, "received_bytes": 60000000 }
  }
}
```

### Endpoint Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| **Health** | | | |
| GET | `/health` | No | Service health + version |
| **Calls** | | | |
| GET | `/calls` | Yes | List calls (paginated, filterable) |
| GET | `/calls/:id` | Yes | Get call with transcript + analysis |
| POST | `/calls` | Yes | Upload audio → start processing |
| PATCH | `/calls/:id` | Yes | Rename, update metadata |
| DELETE | `/calls/:id` | Yes | Soft-delete call + storage cleanup |
| **Transcription** | | | |
| POST | `/calls/:id/transcribe` | Yes | Re-trigger transcription |
| GET | `/calls/:id/transcript` | Yes | Get transcript segments |
| POST | `/calls/:id/speakers` | Yes | Assign speaker roles |
| **Analysis** | | | |
| POST | `/calls/:id/analyze` | Yes | Trigger AI analysis |
| GET | `/calls/:id/analysis` | Yes | Get analysis results |
| **Dashboard** | | | |
| GET | `/dashboard` | Yes | User dashboard stats |
| GET | `/dashboard/trends` | Yes | Performance over time |
| GET | `/dashboard/team` | Manager | Team comparison |
| **Practice** | | | |
| GET | `/practice/sessions` | Yes | List practice sessions |
| POST | `/practice/sessions` | Yes | Start new session |
| PUT | `/practice/sessions/:id` | Yes | Update (add messages) |
| POST | `/practice/sessions/:id/feedback` | Yes | Get AI feedback |
| POST | `/practice/roleplay` | Yes | Single-turn roleplay |
| **Stories** | | | |
| GET | `/stories` | Yes | List stories (filter by category) |
| POST | `/stories` | Yes | Create story |
| PUT | `/stories/:id` | Yes | Update story |
| DELETE | `/stories/:id` | Yes | Delete story |
| **Live Coaching** | | | |
| POST | `/live/sessions` | Yes | Start live session |
| PATCH | `/live/sessions/:id` | Yes | Pause/end session |
| GET | `/live/sessions/:id/insights` | Yes | Get real-time insights |
| GET | `/live/token` | Yes | Get provider auth token |
| **Sales Flows** | | | |
| GET | `/flows` | Yes | List flows |
| POST | `/flows` | Yes | Create flow |
| PUT | `/flows/:id` | Yes | Update flow (with nodes) |
| DELETE | `/flows/:id` | Yes | Delete flow |
| **Conversation Trees** | | | |
| GET | `/trees` | Yes | List trees |
| POST | `/trees` | Yes | Create tree |
| PUT | `/trees/:id` | Yes | Update tree (with nodes/edges) |
| DELETE | `/trees/:id` | Yes | Delete tree |
| **AI Assistant** | | | |
| POST | `/assistant` | Yes | Send message, get coaching response |
| **Export** | | | |
| POST | `/export/pdf` | Yes | Generate PDF report |
| GET | `/export/csv` | Yes | Export calls as CSV |
| **Mind Maps** | | | |
| GET | `/mind-maps` | Yes | List mind maps |
| POST | `/mind-maps` | Yes | Create mind map |
| PUT | `/mind-maps/:id` | Yes | Update mind map |
| DELETE | `/mind-maps/:id` | Yes | Delete mind map |
| **Scripts** | | | |
| GET | `/scripts` | Yes | List user scripts |
| POST | `/scripts` | Yes | Create script |
| PUT | `/scripts/:id` | Yes | Update script |
| DELETE | `/scripts/:id` | Yes | Delete script |

### Pagination

All list endpoints support cursor-based pagination:

```
GET /api/v1/calls?cursor=<uuid>&limit=20&sort=created_at&order=desc
```

Response includes:
```json
{
  "data": [...],
  "meta": {
    "next_cursor": "abc-123",
    "has_more": true,
    "total": 142
  }
}
```

---

## 3. Service Layer Design

Services are the **only layer that talks to the database**. Routes call services; services return typed results or raise domain exceptions.

### Key Design Principles

1. **Routes are thin** — validate input (Pydantic), call service, return response
2. **Services are testable** — accept typed params, return typed results, no `request` object
3. **Providers are swappable** — `TranscriptionService` doesn't know if it's using AssemblyAI or Deepgram

### Example Flow: Call Upload → Analysis

```
[Client] → POST /api/v1/calls (multipart/form-data)
  │
  ├── routes/upload.py
  │   ├── Validates file (size, MIME type)
  │   ├── Calls upload_service.process_upload(user_id, file)
  │   └── Returns 202 Accepted + job_id
  │
  ├── services/upload_service.py
  │   ├── Generates storage path: {user_id}/{uuid}.{ext}
  │   ├── Uploads to Supabase Storage
  │   ├── Creates calls row (status='uploading')
  │   ├── Enqueues transcription_task
  │   └── Returns job_id
  │
  ├── tasks/transcription_task.py (background)
  │   ├── Updates call status → 'transcribing'
  │   ├── Calls transcription_service.transcribe(call_id)
  │   ├── Stores transcript_segments rows
  │   ├── Updates call status → 'analyzing'
  │   ├── Calls analysis_service.analyze(call_id)
  │   ├── Stores analysis row
  │   └── Updates call status → 'completed'
  │
  └── [Client polls] GET /api/v1/calls/{id} → sees status progression
```

### Service Responsibilities

| Service | Responsibility |
|---------|---------------|
| `auth_service` | JWT verification, extract user_id, check roles |
| `call_service` | Call CRUD, status management, storage cleanup |
| `upload_service` | File validation, storage upload, job creation |
| `transcription_service` | Provider selection, transcription orchestration, segment storage |
| `analysis_service` | Prompt building, OpenAI calls, result parsing, score computation |
| `dashboard_service` | Aggregation queries (calls `get_dashboard_stats` RPC), caching |
| `practice_service` | Scenario generation, message handling, feedback generation |
| `story_service` | Story CRUD with category/tag filtering |
| `live_service` | WebSocket session lifecycle, chunk storage, insight generation |
| `assistant_service` | Context-aware AI coaching with conversation memory |
| `scoring_service` | Normalizes raw AI scores, computes weighted overall score |
| `export_service` | PDF generation (ReportLab), CSV streaming |

---

## 4. Authentication & Authorization

### Flow

```
[Client] → Authorization: Bearer <supabase_jwt>
  │
  ├── middleware/auth.py → @require_auth
  │   ├── Extracts token from header
  │   ├── Verifies JWT via Supabase (or local JWKS cache)
  │   ├── Extracts user_id from sub claim
  │   ├── Passes user_id to route handler
  │   └── Returns 401 if invalid
  │
  └── Optional: @require_role('manager')
      ├── Looks up profiles.role
      └── Returns 403 if insufficient
```

### Implementation

```python
# middleware/auth.py
from functools import wraps
from flask import request, g, jsonify
from services.auth_service import verify_token

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = extract_bearer_token(request.headers.get('Authorization'))
        if not token:
            return jsonify(error={"code": "UNAUTHORIZED", "message": "Missing token"}), 401
        
        user = verify_token(token)
        if not user:
            return jsonify(error={"code": "UNAUTHORIZED", "message": "Invalid token"}), 401
        
        g.user_id = user['sub']
        g.user_role = user.get('role', 'user')
        return f(*args, **kwargs)
    return decorated

def require_role(*roles):
    def decorator(f):
        @wraps(f)
        @require_auth
        def decorated(*args, **kwargs):
            if g.user_role not in roles:
                return jsonify(error={"code": "FORBIDDEN", "message": "Insufficient permissions"}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
```

---

## 5. Error Handling Strategy

### Domain Exceptions

```python
# All custom exceptions inherit from a base
class AppError(Exception):
    status_code = 500
    code = "INTERNAL_ERROR"
    
    def __init__(self, message: str, details: dict = None):
        self.message = message
        self.details = details or {}

class NotFoundError(AppError):
    status_code = 404
    code = "NOT_FOUND"

class ValidationError(AppError):
    status_code = 422
    code = "VALIDATION_ERROR"

class AuthenticationError(AppError):
    status_code = 401
    code = "UNAUTHORIZED"

class ForbiddenError(AppError):
    status_code = 403
    code = "FORBIDDEN"

class ExternalServiceError(AppError):
    status_code = 502
    code = "EXTERNAL_SERVICE_ERROR"

class RateLimitError(AppError):
    status_code = 429
    code = "RATE_LIMIT_EXCEEDED"
```

### Global Error Handler

```python
# middleware/error_handler.py
@app.errorhandler(AppError)
def handle_app_error(error):
    return jsonify(error={
        "code": error.code,
        "message": error.message,
        "details": error.details
    }), error.status_code

@app.errorhandler(Exception)
def handle_unexpected_error(error):
    logger.exception("Unexpected error")
    return jsonify(error={
        "code": "INTERNAL_ERROR",
        "message": "An unexpected error occurred"
    }), 500
```

### External Service Resilience

```python
# providers/openai_provider.py
import tenacity

@tenacity.retry(
    stop=tenacity.stop_after_attempt(3),
    wait=tenacity.wait_exponential(min=1, max=10),
    retry=tenacity.retry_if_exception_type((openai.RateLimitError, openai.APITimeoutError)),
    before_sleep=lambda retry_state: logger.warning(f"OpenAI retry #{retry_state.attempt_number}")
)
def chat_completion(messages, model=None, temperature=0.3):
    model = model or config.OPENAI_ANALYSIS_MODEL
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature
    )
    return response
```

---

## 6. Configuration Management

```python
# config.py
import os
from dataclasses import dataclass

@dataclass
class Config:
    # Flask
    SECRET_KEY: str = os.getenv('FLASK_SECRET_KEY', 'change-me')
    ENV: str = os.getenv('FLASK_ENV', 'production')
    DEBUG: bool = ENV == 'development'
    
    # Supabase
    SUPABASE_URL: str = os.getenv('SUPABASE_URL', '')
    SUPABASE_ANON_KEY: str = os.getenv('SUPABASE_ANON_KEY', '')
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')
    
    # OpenAI — all model names in one place
    OPENAI_API_KEY: str = os.getenv('OPENAI_API_KEY', '')
    OPENAI_ANALYSIS_MODEL: str = 'gpt-4o'
    OPENAI_FAST_MODEL: str = 'gpt-4o-mini'
    OPENAI_COACHING_MODEL: str = 'gpt-4o'
    
    # AssemblyAI
    ASSEMBLYAI_API_KEY: str = os.getenv('ASSEMBLYAI_API_KEY', '')
    
    # Deepgram
    DEEPGRAM_API_KEY: str = os.getenv('DEEPGRAM_API_KEY', '')
    
    # CORS
    CORS_ORIGINS: list = os.getenv('CORS_ORIGINS', 'http://localhost:5173').split(',')
    
    # Rate limiting
    RATE_LIMIT_ENABLED: bool = os.getenv('RATE_LIMIT_ENABLED', 'true').lower() == 'true'
    RATE_LIMIT_DEFAULT: str = '60/minute'
    RATE_LIMIT_UPLOAD: str = '10/minute'
    RATE_LIMIT_ANALYSIS: str = '20/minute'
    
    # Upload
    MAX_FILE_SIZE_BYTES: int = 52_428_800  # 50 MB
    ALLOWED_AUDIO_TYPES: set = frozenset({
        'audio/mpeg', 'audio/wav', 'audio/mp4',
        'audio/x-m4a', 'audio/ogg', 'audio/webm', 'audio/flac'
    })

config = Config()
```

---

## 7. Security Considerations

### Implemented in Architecture

| Concern | Solution |
|---------|----------|
| **Authentication** | Supabase JWT verification on every protected route |
| **Authorization** | RLS policies in DB + role checks in middleware |
| **CORS** | Restricted to configured origins only |
| **Rate limiting** | Flask-Limiter per endpoint category |
| **Input validation** | Pydantic models on all request bodies |
| **File upload** | Size limit, MIME type whitelist, storage isolation by user_id |
| **SQL injection** | Supabase client uses parameterized queries; no raw SQL in app |
| **Secret management** | All secrets from env vars, never logged or exposed |
| **Error information** | Production errors never leak stack traces |
| **HTTPS** | Enforced at infrastructure level (Supabase + CDN/proxy) |

### Removed from Old Architecture

- ❌ Debug endpoints exposing API key previews
- ❌ Wildcard CORS (`*`)
- ❌ AssemblyAI token exposure endpoint (now proxied server-side)

### Additional Recommendations

1. **Helmet-style headers** — Add `X-Content-Type-Options`, `X-Frame-Options`, CSP
2. **Request ID tracking** — Generate UUID per request for log correlation
3. **Audit logging** — Log all destructive operations (delete, role changes)
4. **Token refresh** — Frontend should use Supabase `onAuthStateChange` for seamless refresh

---

## 8. AI Prompt Management

All prompts live in `utils/prompts.py` as named constants/templates:

```python
# utils/prompts.py

SYSTEM_ANALYSIS = """You are an expert sales coach specializing in home-improvement 
sales (construction, renovation, remodeling). Analyze the following sales call 
transcript and provide detailed feedback..."""

SYSTEM_PRACTICE_ROLEPLAY = """You are roleplaying as a homeowner who needs {product_type}. 
You are {difficulty} to convince..."""

SYSTEM_COACHING_ASSISTANT = """You are a personal sales coach. The user is a 
home-improvement sales representative..."""

# Template function for structured analysis
def build_analysis_prompt(transcript_text: str, speaker_map: dict) -> list[dict]:
    return [
        {"role": "system", "content": SYSTEM_ANALYSIS},
        {"role": "user", "content": f"Transcript:\n{transcript_text}\n\nSpeakers: {speaker_map}"}
    ]
```

Benefits:
- Single place to update prompts
- Easy A/B testing of prompt variants
- Version-trackable in git

---

## 9. Background Task Processing

For the MVP, use a **thread pool executor** (no Celery dependency). Upgrade to Celery + Redis when scale demands it.

```python
# tasks/worker.py
from concurrent.futures import ThreadPoolExecutor
import logging

logger = logging.getLogger(__name__)
executor = ThreadPoolExecutor(max_workers=4)

def enqueue(fn, *args, **kwargs):
    """Submit a task to the background worker pool."""
    future = executor.submit(fn, *args, **kwargs)
    future.add_done_callback(_on_complete)
    return future

def _on_complete(future):
    exc = future.exception()
    if exc:
        logger.exception(f"Background task failed: {exc}")
```

### Task Pipeline

```
Upload → Transcription → Analysis → Done

Each step updates:
  - processing_jobs.status / progress
  - calls.status
  
Client polls GET /calls/:id to see progress.
Future: add WebSocket push for real-time status.
```

---

## 10. Testing Strategy

| Layer | Tool | What to Test |
|-------|------|-------------|
| **Unit** | pytest | Services, utils, prompt building, scoring logic |
| **Integration** | pytest + httpx | Route → service → mock DB flow |
| **E2E** | Playwright | Critical user flows (upload → view analysis) |

### Test Fixtures

```python
# tests/conftest.py
@pytest.fixture
def app():
    app = create_app(testing=True)
    yield app

@pytest.fixture  
def client(app):
    return app.test_client()

@pytest.fixture
def auth_headers():
    """Returns headers with a valid test JWT."""
    return {"Authorization": f"Bearer {create_test_token()}"}

@pytest.fixture
def mock_supabase(monkeypatch):
    """Patches Supabase client with in-memory store."""
    ...
```

---

## 11. Deployment

### Development
```bash
# Install dependencies
pip install -r requirements.txt

# Run dev server
FLASK_ENV=development python -m flask run --port 5000
```

### Production
```bash
# Gunicorn with gevent for WebSocket support
gunicorn --worker-class geventwebsocket.gunicorn.workers.GeventWebSocketWorker \
         --workers 2 \
         --bind 0.0.0.0:5000 \
         wsgi:app
```

### Environment Variables Required
```
FLASK_SECRET_KEY
FLASK_ENV
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
ASSEMBLYAI_API_KEY
DEEPGRAM_API_KEY
CORS_ORIGINS
RATE_LIMIT_ENABLED
```

---

## Summary

The refactored architecture replaces the monolithic 7,167-line `app.py` with ~40 focused files averaging 100–200 lines each. Every route is protected by auth middleware, every request is validated by Pydantic, and every database operation goes through RLS. External services are wrapped in retry-capable providers, and all AI prompts live in a single versioned file.
