# Sales Call Analyzer - Backend

Modular Flask backend for the Sales Call Analyzer application.

## Structure

```
backend/
├── config.py              # Centralized configuration
├── main.py                # Flask app entry point
├── requirements.txt       # Dependencies
├── middleware/            # Cross-cutting concerns
│   ├── auth.py           # JWT validation
│   ├── error_handler.py  # Global exception handling
│   └── rate_limit.py     # Rate limiting
├── models/               # Pydantic schemas
│   ├── base.py
│   ├── call.py
│   ├── analysis.py
│   └── user.py
├── routes/               # Flask blueprints
│   ├── auth.py
│   ├── calls.py
│   ├── analysis.py
│   ├── practice.py
│   ├── stories.py
│   └── dashboard.py
├── services/             # Business logic
│   ├── transcription.py
│   ├── analysis.py
│   ├── storage.py
│   └── practice.py
├── providers/            # External API wrappers
│   ├── supabase.py
│   ├── openai_client.py
│   └── assemblyai.py
└── utils/                # Utilities
    ├── prompts.py
    └── validators.py
```

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables (see .env.example)

3. Run development server:
```bash
python main.py
```

## Environment Variables

```bash
# Flask
FLASK_SECRET_KEY=your-secret-key
FLASK_ENV=development

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# OpenAI
OPENAI_API_KEY=sk-...

# AssemblyAI
ASSEMBLYAI_API_KEY=...

# Deepgram
DEEPGRAM_API_KEY=...

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Rate Limiting
RATE_LIMIT_ENABLED=true
```

## API Endpoints

### Health
- `GET /health` - Health check

### Calls
- `GET /api/v1/calls` - List calls
- `POST /api/v1/calls` - Upload call
- `GET /api/v1/calls/:id` - Get call
- `PATCH /api/v1/calls/:id` - Update call
- `DELETE /api/v1/calls/:id` - Delete call
- `GET /api/v1/calls/:id/transcript` - Get transcript
- `POST /api/v1/calls/:id/speakers` - Assign speakers

### Analysis
- `GET /api/v1/analysis/calls/:id` - Get analysis
- `POST /api/v1/analysis/calls/:id` - Create analysis

### Dashboard
- `GET /api/v1/dashboard` - Get stats
- `GET /api/v1/dashboard/trends` - Get trends
- `GET /api/v1/dashboard/category-averages` - Get category averages

### Practice
- `GET /api/v1/practice/sessions` - List sessions
- `POST /api/v1/practice/sessions` - Create session
- `POST /api/v1/practice/sessions/:id/messages` - Send message
- `POST /api/v1/practice/sessions/:id/feedback` - Get feedback

## Security

- JWT token validation on all protected routes
- CORS restricted to configured origins
- Rate limiting on upload and analysis endpoints
- Input validation on all file uploads
- Row Level Security (RLS) policies in Supabase
