# Coffee-with-Cinema: AI Storyboard & Script Generator (Flask + Ollama)

Flask backend that generates:
- Screenplay
- Character profiles
- Sound design plan

AI runs locally via **Ollama** using the model **`granite4:micro`**.

---

## Quick Start (Hackathon Evaluation)

### 1) Start Ollama + pull the model

```powershell
ollama serve
ollama pull granite4:micro
```

### 2) Activate the existing venv

```powershell
cd "C:\Users\meera\Desktop\smartbridge hackathon\scriptoria - Copy"
.\.venv\Scripts\Activate.ps1
```

### 3) Set required env vars (PowerShell)

```powershell
$env:FLASK_SECRET_KEY = "hackathon_dev_secret"
# Optional (default: http://localhost:11434)
$env:OLLAMA_BASE_URL = "http://localhost:11434"
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

Optional:
- `OLLAMA_BASE_URL` — Ollama base URL (default: `http://localhost:11434`).
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

## AI Backend (Ollama)

The AI calls are made to:
- `POST {OLLAMA_BASE_URL}/api/generate`

Using:
- Model: `granite4:micro`
- `stream: false`
- `temperature: 0.7`
- `num_predict: 2500`
- Timeout: `120s`

---

## Troubleshooting

### Ollama is not running / connection refused
- Start Ollama: `ollama serve`
- Confirm it’s reachable: `http://localhost:11434`

### Missing model
- Pull it: `ollama pull granite4:micro`

### Flask secret key error
- Set it in PowerShell before running:
  ```powershell
  $env:FLASK_SECRET_KEY = "hackathon_dev_secret"
  ```

---

## Repo Structure

- `main.py` — Flask app + routes + downloads
- `ai_engine.py` — AI pipeline (Ollama client + prompts)
- `templates/` — frontend HTML
- `static/` — frontend JS/CSS
- `tmp_downloads/` — generated download staging (runtime)
- `instance/flask_session/` — server-side sessions (runtime)
