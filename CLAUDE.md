# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vault-PM is an AI-powered project manager app that converts voice recordings into structured project plans. Users dictate ideas freely; the AI (acting as a PM/PO) transcribes, analyzes, and organizes them into actionable tasks. The app supports real-time chat to refine projects.

## Architecture

Three-layer monorepo:

```
mobile/          React Native / Expo app (iOS, Android, Web)
backend/         Python FastAPI — stateless AI proxy only (no DB)
supabase/        SQL schema + migrations for Postgres (via Supabase)
```

**Data flow:**
1. Mobile records audio → sends to backend `/api/analyze/audio`
2. Backend: Whisper transcribes → LLM analyzes → returns structured JSON
3. Mobile saves result to Supabase (projects, messages tables)
4. Chat: Mobile sends project context + messages → backend `/api/chat` → LLM responds with optional `project_updates` → mobile updates Supabase

**The backend never stores data.** All persistence is in Supabase via the mobile client using Row Level Security.

## Backend (Python / FastAPI)

### Dev commands
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in API keys
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Key files
- `app/main.py` — FastAPI app, all route definitions
- `app/models.py` — Pydantic models: `Task`, `ProjectPayload`, `AnalyzeResponse`, `AiReview`
- `app/config.py` — Settings via `pydantic-settings` (reads `.env`)
- `app/prompts.py` — Loads the PM Expert system prompt from `pm-knowledge-base/`
- `app/services/transcription.py` — Whisper calls; `transcribe_audio_validated()` enforces FR/EN language
- `app/services/structuring.py` — `analyze_transcript()` uses the full PM Expert prompt; `structure_transcript()` uses a simpler Scrum Master prompt
- `app/services/chat.py` — Conversational PM chat; returns JSON with `message` + optional `project_updates`
- `app/services/update_project.py` — Merges a new voice dictation into an existing project
- `index.py` — Vercel serverless entry point (`from app.main import app`)

### AI provider switching
Controlled by `AI_PROVIDER` env var (`groq` or `openai`). Groq uses OpenAI-compatible SDK with `base_url="https://api.groq.com/openai/v1"`. Default: Groq with `llama-3.3-70b-versatile` + `whisper-large-v3-turbo`.

### Vercel deployment
Set **Root Directory** to `backend` in Vercel project settings. The `vercel.json` at repo root serves a static fallback page only.

### Running the benchmark
```bash
# From repo root, with venv activated
python eval/benchmark_full.py
```

## Mobile (React Native / Expo)

### Dev commands
```bash
cd mobile
npm install
npx expo start        # scan QR with Expo Go, or press 'w' for web
npx expo start --ios
npx expo start --android
```

### Key files
- `App.js` — Root: providers (SafeArea, Theme, Auth, Navigation), bottom tab bar with `CurvedBottomBarExpo`, onboarding gate
- `src/api.js` — All fetch calls to the FastAPI backend. **Update `API_BASE` IP for local dev** (mobile uses device IP, web uses localhost)
- `src/lib/supabase.js` — Supabase client (URL + anon key hardcoded)
- `src/storage.js` — AsyncStorage helpers for profile caching
- `src/contexts/AuthContext.js` — Supabase auth session management
- `src/contexts/ThemeContext.js` — Dark/light theme colors
- `src/contexts/QuickDictateContext.js` — Global quick-dictate bottom sheet state

### Screen structure
- `HomeScreen` — Dashboard with quick notes and project summaries
- `DictateScreen` — Full voice recording with live transcript
- `ProjectsScreen` → `ProjectDetailScreen` (3 tabs: Résumé / Tâches / Chat PM) → `UpdateProjectScreen`
- `SettingsScreen`, `ProfileScreen`, `OnboardingScreen`, `ExploreScreen`

### Components
- `QuickDictateSheet` — Global floating bottom sheet for quick voice capture (triggered from mic button in tab bar)
- `KanbanView` — Drag-and-drop task board
- `ChatView` — PM chat interface
- `RecordButton`, `LiveTranscript`, `TaskCard`, `GlassCard`, `RadialChart`

## Supabase Schema

Tables: `profiles`, `projects`, `messages`, `quick_notes`, `user_settings`

- `projects.tasks` — stored as JSONB (array of Task objects)
- `projects.review` — stored as JSONB (AiReview object)
- All tables have RLS policies: users see only their own rows

To set up: run `supabase/schema.sql` in the Supabase SQL Editor, then run `supabase/migrations/001_quick_notes_and_user_settings.sql`.

## Environment Variables (backend/.env)

| Variable | Description |
|---|---|
| `AI_PROVIDER` | `groq` (default, free) or `openai` |
| `GROQ_API_KEY` | From console.groq.com |
| `OPENAI_API_KEY` | Optional, if using OpenAI |
| `LLM_MODEL` | Default: `llama-3.3-70b-versatile` |
| `WHISPER_MODEL` | Default: `whisper-large-v3-turbo` |
| `TRELLO_API_KEY/TOKEN/BOARD_ID/LIST_ID` | Optional Trello integration |
| `WEBHOOK_URL` | Optional outbound webhook |

## Key Design Patterns

- **AI responses always use `response_format: json_object`** — all LLM calls return structured JSON, never free text
- **Task model** has `status` (todo/in_progress/done), `priority` (Haute/Moyenne/Basse), `due_date` (ISO date), `order` (int for sorting)
- **Chat updates are full replacements** — when the PM chat modifies tasks, it returns the complete task list, not a diff
- **Audio validation** only on `analyze/audio` (not on raw `transcribe`) — validates FR/EN language and audibility before LLM call
- **PM Expert knowledge base** (`backend/pm-knowledge-base/`) contains methodology docs (RICE, MoSCoW, Lean Canvas, Scrum) loaded into the system prompt at startup via `app/prompts.py`
