# CineVerse AI Studio — AI Storyboard & Script Generator

CineVerse AI Studio is a cinematic AI workspace that turns a single story idea into a full pre-production package: a properly formatted screenplay, rich character profiles, and a scene-by-scene sound design plan. It is built for hackathon demos, investor-ready presentations, and fast creative iteration with Gemini-powered generation.

---

## Tech Stack (Flask + Gemini)

Flask backend that generates:
- Screenplay
- Character profiles
- Sound design plan

AI runs via **Google Gemini** using a configurable model (default: `gemini-2.5-flash`).

---

## Features

### AI generation (Gemini)
- **Gemini API integration** using a configurable model (default: `gemini-2.5-flash`).
- **Genre + tone + setting analysis** returned as structured JSON (`genre_analysis`).
- **Industry-style screenplay formatting** (scene headings, action, dialogue blocks; plain text output).
- **Character profiles** with clear sectioning for easy reading; plain-text responses with `---` dividers render as individual cards in the UI.
- **Sound design plan** (scene-wise cues + ambience + SFX direction).
- **Two orchestration modes**:
  - Multi-step pipeline (analysis → screenplay → characters → sound)
  - Single-call pipeline (`AI_SINGLE_CALL=1` or request `single_call=true`) for faster/cheaper runs

### Backend & UX
- **REST JSON API** designed for frontend integration.
- **Session-based persistence** (server-side filesystem sessions) so generated text can be downloaded later.
- **Download exports**:
  - `txt` (plain text)
  - `pdf` (multi-page, wrapped lines)
  - `docx` (Word-compatible)
- **Built-in UI** served from `/` (templates + static assets) for quick demos.
- **Language-aware generation** — UI language selector (English, Hindi, Telugu, Tamil, Kannada, Malayalam) is sent to the backend so screenplay/characters/sound outputs are produced in that language.

### Production-friendly behavior
- Configurable via environment variables (secret key, ports, CORS, Gemini model).
- AI layer kept modular in `ai_engine.py` (client + prompts + parsing).
- Error handling covers common AI/HTTP failures (timeout, connection issues, HTTP errors, missing model).

---

## Quick Start (Hackathon Evaluation)

### 1) Configure Gemini API access

Create a Gemini API key and store it as an environment variable (see below).

### 2) Activate the existing venv

```powershell
cd "C:\Users\meera\Desktop\smartbridge hackathon\scriptoria - Copy"
.\.venv\Scripts\Activate.ps1
```

### 3) Set required env vars (PowerShell)

```powershell
$env:FLASK_SECRET_KEY = "hackathon_dev_secret"
$env:GEMINI_API_KEY = "your_api_key_here"
# Optional (default: gemini-2.5-flash)
$env:GEMINI_MODEL = "gemini-2.5-flash"
```

### 4) Run the backend

```powershell
python main.py
```

Backend will run on:
- `http://127.0.0.1:5000`

Health check:
- `GET http://127.0.0.1:5000/api/health`

---

## Environment Variables

Required:
- `FLASK_SECRET_KEY` — session signing key (required when `FLASK_DEBUG` is off).
- `GEMINI_API_KEY` — Gemini API key used for generation.

Optional:
- `GEMINI_MODEL` — Gemini model ID (default: `gemini-2.5-flash`).
- `FLASK_DEBUG` — set to `1`/`true` for debug behavior.
- `FLASK_HOST` — default `127.0.0.1`.
- `FLASK_PORT` — default `5000`.
- `FLASK_COOKIE_SECURE` — set to `1`/`true` when running behind HTTPS.
- `MIN_STORY_CHARS` — minimum story length for validation (default `120`).
- `AI_SINGLE_CALL` — set to `1`/`true` to use the single-call pipeline.
- `CORS_ORIGINS` — comma-separated list of allowed origins (optional).

Template file:
- See `.env.example` (copy to `.env` for local use; do not commit secrets).

---

## API Endpoints

### `GET /`
Serves the UI (`templates/index.html`).

### `GET /api/health`
Returns:
```json
{ "ok": true, "status": "healthy" }
```

### `POST /set_username`
Body:
```json
{ "username": "Meera" }
```

### `POST /generate_content`
If `story` is provided, the backend runs the AI pipeline and stores outputs in the session.

Body:
```json
{
  "story": "A short story idea...",
  "temperature": 0.7,
  "min_story_chars": 120,
  "single_call": true,
  "language": "en"   // optional; accepts en|hi|te|ta|kn|ml or a language name
}
```

Response includes:
- `screenplay`
- `characters`
- `sound_design`
- `genre_analysis`

### `POST /download/<format_type>`
Where `<format_type>` is `txt`, `pdf`, or `docx`.

Body:
```json
{ "type": "screenplay" }
```
Valid `type` values:
- `screenplay`
- `characters`
- `sound_design`

Language follows the last generation request (stored in session meta).

---

## AI Backend (Gemini)

The AI calls are made to the Gemini API using your `GEMINI_API_KEYS` (round-robin) or `GEMINI_API_KEY`.

Using:
- Model: `gemini-2.5-flash`
- Temperature: `0.7`
- Max output tokens: `2500`
- Timeout: `120s`

---

## Troubleshooting

### Gemini API errors (unauthorized or quota)
- Verify `GEMINI_API_KEY` is set and valid.
- Check your Gemini API quota and billing status.

### Flask secret key error
- Set it in PowerShell before running:
  ```powershell
  $env:FLASK_SECRET_KEY = "hackathon_dev_secret"
  ```

---

## Repo Structure

- `main.py` — Flask app + routes + downloads
- `ai_engine.py` — AI pipeline (Gemini client + prompts)
- `templates/` — frontend HTML
- `static/` — frontend JS/CSS
- `tmp_downloads/` — generated download staging (runtime)
- `instance/flask_session/` — server-side sessions (runtime)
- `api/index.py` — Vercel serverless entrypoint (imports `create_app`)
- `vercel.json` — Vercel config (routes all traffic to Flask app)

---

## Recent Updates (Feb 2026)

- Language preference from the UI is sent to Gemini so outputs render in the selected language.
- Character profiles in plain text are auto-split into stacked cards using `---` dividers.

---

## Deploy to Vercel (Serverless Python)

1) Ensure `requirements.txt` includes your deps (Flask, flask-cors, flask-session, python-dotenv, reportlab, python-docx, requests).
2) Files added for Vercel:
  - `vercel.json` to route all requests to the Python build.
  - `api/index.py` which exposes `app = create_app()` from `main.py`.
3) Set environment variables in Vercel dashboard:
  - `FLASK_SECRET_KEY`
  - `GEMINI_API_KEY` (or `GEMINI_API_KEYS` comma-separated)
  - Optional: `GEMINI_MODEL`, `MIN_STORY_CHARS`, `AI_SINGLE_CALL`, `CORS_ORIGINS`.
4) Deploy:
  - Install Vercel CLI: `npm i -g vercel`
  - From the project root: `vercel --prod`
5) After deploy, test:
  - `GET https://<your-vercel-domain>/api/health`
  - Open the root URL to load the UI served by Flask.
