# Meet Scribe

AI-powered bot that joins your Google Meet calls, captures live captions, and delivers structured summaries in real time.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│              React + Vite + Tailwind CSS                     │
│         Firebase Auth  │  WebSocket Client                   │
└──────────┬─────────────┴─────────────┬───────────────────────┘
           │ HTTP (REST)               │ WebSocket
┌──────────▼───────────────────────────▼───────────────────────┐
│                       Backend (FastAPI)                       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ API Routes   │  │ WS Manager   │  │ Internal Callback    │ │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬───────────┘ │
│         │                │                      │             │
│  ┌──────▼──────────────────────────────────────▼───────────┐ │
│  │              ProcessPoolExecutor                         │ │
│  │  ┌────────────────────────────────────────────────────┐  │ │
│  │  │  Bot Process (Playwright + Chromium)                │  │ │
│  │  │  → Join Meet → Scrape Captions → Build Transcript  │  │ │
│  │  └────────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────┘ │
│         │                │                      │             │
│  ┌──────▼──────┐  ┌─────▼──────┐  ┌───────────▼──────────┐  │
│  │  Firebase    │  │  Firebase  │  │  Google Gemini       │  │
│  │  Admin SDK   │  │  Storage   │  │  (Summarization)     │  │
│  └─────────────┘  └────────────┘  └──────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Firebase project with Auth and Storage enabled
- Google Gemini API key

### Setup

1. **Clone and configure secrets:**

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# Fill in your actual values in both files

# Place your Firebase service account JSON:
mkdir -p secrets
cp /path/to/your/firebase-service-account.json secrets/firebase-service-account.json
```

2. **Run with Docker:**

```bash
# Production
docker compose up --build

# Development (with hot reload)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

3. **Access the app:**
   - Frontend: http://localhost (prod) or http://localhost:5173 (dev)
   - Backend API: http://localhost:8000
   - Health check: http://localhost:8000/health

### Local Development (without Docker)

**Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
playwright install chromium
playwright install-deps
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `FIREBASE_CREDENTIALS_PATH` | Path to Firebase service account JSON |
| `FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket name |
| `GEMINI_API_KEY` | Google Gemini API key |
| `CORS_ORIGINS` | Comma-separated allowed origins |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL |
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |

## Key Design Decisions

- **Single Worker**: Uvicorn runs with `--workers 1` so WebSocket connections and process state live safely in one process. No Redis needed.
- **ProcessPoolExecutor**: Each bot gets its own OS process with its own event loop — Uvicorn's loop is never blocked.
- **Fake Media Streams**: Chromium uses `--use-fake-device-for-media-stream` — no video/audio decoding, RAM stays flat.
- **Internal HTTP Callbacks**: Bot processes report status via HTTP POST to the main process, which forwards to WebSocket clients.
