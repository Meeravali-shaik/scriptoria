# CineForge AI Studio — AI Storyboard & Script Generator

CineForge AI Studio is a cinematic AI workspace that turns a single story idea into a full pre-production package: a properly formatted screenplay, rich character profiles, and a scene-by-scene sound design plan. It is built for hackathon demos, investor-ready presentations, and fast creative iteration with Gemini-powered generation.

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
- **Character profiles** with clear sectioning for easy reading.
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
  "single_call": true
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
