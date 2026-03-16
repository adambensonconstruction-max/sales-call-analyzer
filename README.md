# Sales Call Analyzer

AI-powered sales coaching platform for home-improvement sales professionals.

## Features

- 📞 **Call Analysis** — Upload sales calls and get AI-powered insights
- 📊 **Performance Dashboard** — Track your progress over time
- 🎯 **Skill Scoring** — Discovery, rapport, objection handling, closing
- 🎭 **Practice Mode** — Roleplay with AI to improve your skills
- 📚 **Story Bank** — Store and reuse successful sales stories
- 🔴 **Live Coaching** — Real-time AI assistance during calls

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** Flask + Python + Supabase
- **AI:** OpenAI GPT-4o, AssemblyAI, Deepgram
- **Database:** PostgreSQL (Supabase)

## Quick Start

```bash
# Clone and setup
git clone <repo-url>
cd sales-call-analyzer
chmod +x setup.sh
./setup.sh

# Or manually:
cd backend && pip install -r requirements.txt && python main.py
cd frontend && npm install && npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your API keys:
- OpenAI API Key
- AssemblyAI API Key
- Deepgram API Key
- Supabase URL and keys

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment instructions.

## License

MIT
