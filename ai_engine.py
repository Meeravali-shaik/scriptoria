"""Coffee-with-Cinema: AI Storyboard & Script Generator — AI/ML Module

This module is intentionally backend-agnostic.
It provides a structured generation pipeline using a local Ollama server.

Requirements:
    - Environment variable (optional): OLLAMA_BASE_URL (default: http://localhost:11434)
    - Local Ollama model: granite4:micro

Exports:
    - validate_story_input
    - detect_genre_and_tone
    - generate_screenplay
    - generate_character_profiles
    - generate_sound_design_plan
    - run_full_pipeline
        - run_full_pipeline_single_call

Model:
    - granite4:micro
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from typing import Any, Dict, Optional

import requests
from requests import Response
from requests.exceptions import ConnectionError as RequestsConnectionError
from requests.exceptions import HTTPError as RequestsHTTPError
from requests.exceptions import RequestException
from requests.exceptions import Timeout as RequestsTimeout


MODEL_NAME = "granite4:micro"
DEFAULT_TEMPERATURE = 0.7
DEFAULT_MIN_STORY_CHARS = 120
DEFAULT_NUM_PREDICT = 2500
DEFAULT_TIMEOUT_SECONDS = 120


class AIEngineError(RuntimeError):
    """Raised for AI module failures (validation, API, parsing)."""


@dataclass(frozen=True)
class GenreToneAnalysis:
    """Structured genre/tone analysis result."""

    genre: str
    tone: str
    setting: str


class OllamaClient:
    """Thin wrapper around the local Ollama HTTP API."""

    def __init__(
        self,
        *,
        base_url: Optional[str] = None,
        model: str = MODEL_NAME,
        timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
        num_predict: int = DEFAULT_NUM_PREDICT,
    ) -> None:
        base = (base_url or os.getenv("OLLAMA_BASE_URL", "") or "http://localhost:11434").strip()
        if not base:
            base = "http://localhost:11434"

        self._base_url = base.rstrip("/")
        self._model = (model or MODEL_NAME).strip() or MODEL_NAME
        self._timeout_seconds = int(timeout_seconds)
        self._num_predict = int(num_predict)

    @property
    def base_url(self) -> str:
        return str(self._base_url)

    @property
    def model(self) -> str:
        return str(self._model)

    def _endpoint(self) -> str:
        return f"{self._base_url}/api/generate"

    def _extract_error_message(self, resp: Response) -> str:
        try:
            data = resp.json()
            if isinstance(data, dict):
                err = data.get("error")
                if err:
                    return str(err).strip()
        except Exception:
            pass
        return (resp.text or "").strip() or "Unknown error"

    def generate_text(
        self,
        *,
        prompt: str,
        temperature: float = DEFAULT_TEMPERATURE,
        max_output_tokens: int = 4096,
        retries: int = 2,
        timeout_hint_seconds: float = 30.0,
    ) -> str:
        """Generate text using Ollama.

        Args:
            prompt: Fully composed prompt (no markdown expected).
            temperature: Sampling temperature.
            max_output_tokens: Output token budget.
            retries: Retry count for transient failures.
            timeout_hint_seconds: Used only for backoff pacing (SDK-managed timeouts).

        Returns:
            Clean text output.

        Raises:
            AIEngineError: On API, transport, or parsing errors.
        """

        temperature = _clamp_temperature(temperature)
        url = self._endpoint()

        # NOTE: max_output_tokens is accepted for API compatibility with the previous client.
        # Ollama uses `num_predict`; per backend requirements we keep this at a fixed default.
        payload = {
            "model": self._model,
            "prompt": str(prompt or ""),
            "stream": False,
            "options": {
                "temperature": float(temperature),
                "num_predict": int(self._num_predict),
            },
        }

        last_err: Optional[Exception] = None
        attempts = max(0, int(retries)) + 1

        for attempt in range(attempts):
            try:
                resp = requests.post(url, json=payload, timeout=self._timeout_seconds)
            except RequestsConnectionError as exc:
                raise AIEngineError(
                    f"Ollama connection refused or unreachable at {self._base_url}. "
                    "Start Ollama and ensure it listens on 11434."
                ) from exc
            except RequestsTimeout as exc:
                raise AIEngineError(
                    f"Ollama request timed out after {self._timeout_seconds}s."
                ) from exc
            except RequestException as exc:
                raise AIEngineError(f"Ollama request failed: {exc}") from exc

            try:
                resp.raise_for_status()
            except RequestsHTTPError as exc:
                msg = self._extract_error_message(resp)
                lower = msg.lower()
                if "not found" in lower and ("model" in lower or self._model.lower() in lower):
                    raise AIEngineError(
                        f"Ollama model '{self._model}' not found. Run: ollama pull {self._model}"
                    ) from exc

                # Retry only for server-side errors.
                if 500 <= int(resp.status_code) < 600 and attempt + 1 < attempts:
                    last_err = exc
                    continue

                raise AIEngineError(f"Ollama HTTP error {resp.status_code}: {msg}") from exc

            try:
                data = resp.json()
            except ValueError as exc:
                raise AIEngineError("Invalid JSON response from Ollama.") from exc

            if not isinstance(data, dict):
                raise AIEngineError("Invalid JSON response from Ollama (expected object).")

            if data.get("error"):
                msg = str(data.get("error")).strip()
                lower = msg.lower()
                if "not found" in lower and ("model" in lower or self._model.lower() in lower):
                    raise AIEngineError(
                        f"Ollama model '{self._model}' not found. Run: ollama pull {self._model}"
                    )
                raise AIEngineError(f"Ollama error: {msg}")

            text = str(data.get("response") or "").strip()
            if not text:
                raise AIEngineError("Empty response from Ollama.")

            return _normalize_newlines(text)

        raise AIEngineError(f"Ollama request failed: {last_err}")


# -----------------------------
# 1) Input validation
# -----------------------------

def validate_story_input(story_idea: str, *, min_chars: int = DEFAULT_MIN_STORY_CHARS) -> str:
    """Validate the user's story idea.

    Prevents empty input and enforces a minimum length.

    Args:
        story_idea: User provided story idea.
        min_chars: Minimum number of non-whitespace characters.

    Returns:
        Normalized story text.

    Raises:
        AIEngineError: If invalid.
    """

    if story_idea is None:
        raise AIEngineError("Story idea is required.")

    cleaned = _normalize_newlines(str(story_idea)).strip()
    cleaned_compact = re.sub(r"\s+", " ", cleaned).strip()

    if not cleaned_compact:
        raise AIEngineError("Story idea cannot be empty.")

    # Count non-whitespace characters for robustness.
    non_ws_chars = len(re.sub(r"\s+", "", cleaned))
    if non_ws_chars < int(min_chars):
        raise AIEngineError(
            f"Story idea is too short. Provide at least {min_chars} non-whitespace characters."
        )

    return cleaned


# -----------------------------
# 2) Genre & tone detection
# -----------------------------

def detect_genre_and_tone(
    story_idea: str,
    *,
    temperature: float = 0.2,
    client: Optional[OllamaClient] = None,
) -> GenreToneAnalysis:
    """Detect genre, tone, and setting.

    Output must be JSON; this function parses and returns a structured object.

    Raises:
        AIEngineError: On API failure or invalid JSON.
    """

    story_idea = validate_story_input(story_idea)
    client = client or OllamaClient()

    prompt = _build_genre_detection_prompt(story_idea)
    raw = client.generate_text(prompt=prompt, temperature=temperature, max_output_tokens=512)

    data = _parse_json_object(raw)

    genre = _clean_scalar(data.get("genre"))
    tone = _clean_scalar(data.get("tone"))
    setting = _clean_scalar(data.get("setting"))

    if not (genre and tone and setting):
        raise AIEngineError("Genre detection returned incomplete JSON (need genre, tone, setting).")

    return GenreToneAnalysis(genre=genre, tone=tone, setting=setting)


# -----------------------------
# 3) Screenplay generation
# -----------------------------

def generate_screenplay(
    story_idea: str,
    analysis: Optional[GenreToneAnalysis] = None,
    *,
    temperature: float = DEFAULT_TEMPERATURE,
    client: Optional[OllamaClient] = None,
) -> str:
    """Generate an industry-formatted screenplay.

    Strict formatting rules:
      - Scene headings in ALL CAPS
      - Use INT./EXT.
      - Character names centered (represented via indentation)
      - No markdown
      - Professional structure

    Returns:
        Screenplay text.

    Raises:
        AIEngineError
    """

    story_idea = validate_story_input(story_idea)
    client = client or OllamaClient()

    prompt = _build_screenplay_prompt(story_idea, analysis)
    text = client.generate_text(prompt=prompt, temperature=temperature, max_output_tokens=8192)

    return _strip_code_fences(text)


# -----------------------------
# 4) Character profile generation
# -----------------------------

def generate_character_profiles(
    story_idea: str,
    analysis: Optional[GenreToneAnalysis] = None,
    *,
    temperature: float = DEFAULT_TEMPERATURE,
    client: Optional[OllamaClient] = None,
) -> str:
    """Generate detailed character profiles with strict sections.

    Returns:
        Plain text profiles.

    Raises:
        AIEngineError
    """

    story_idea = validate_story_input(story_idea)
    client = client or OllamaClient()

    prompt = _build_character_prompt(story_idea, analysis)
    text = client.generate_text(prompt=prompt, temperature=temperature, max_output_tokens=4096)

    return _strip_code_fences(text)


# -----------------------------
# 5) Sound design generation
# -----------------------------

def generate_sound_design_plan(
    story_idea: str,
    analysis: Optional[GenreToneAnalysis] = None,
    *,
    temperature: float = DEFAULT_TEMPERATURE,
    client: Optional[OllamaClient] = None,
) -> str:
    """Generate a scene-wise sound design plan.

    Returns:
        Plain text plan.

    Raises:
        AIEngineError
    """

    story_idea = validate_story_input(story_idea)
    client = client or OllamaClient()

    prompt = _build_sound_design_prompt(story_idea, analysis)
    text = client.generate_text(prompt=prompt, temperature=temperature, max_output_tokens=4096)

    return _strip_code_fences(text)


# -----------------------------
# 6) Full pipeline orchestration
# -----------------------------

def run_full_pipeline(
    story_idea: str,
    *,
    temperature: float = DEFAULT_TEMPERATURE,
    min_story_chars: int = DEFAULT_MIN_STORY_CHARS,
    client: Optional[OllamaClient] = None,
) -> Dict[str, Any]:
    """Run the complete AI pipeline.

    Returns a structured dictionary for easy integration with a Flask backend.

    Args:
        story_idea: User story concept.
        temperature: Optional temperature for generative steps (screenplay/characters/sound).
        min_story_chars: Minimum story length.
        client: Optional shared OllamaClient instance.

    Returns:
        {
          "ok": bool,
          "genre_analysis": {"genre": str, "tone": str, "setting": str},
          "screenplay": str,
          "characters": str,
          "sound_design": str,
          "errors": [str, ...],
          "meta": {"model": str}
        }
    """

    errors = []

    try:
        story_idea = validate_story_input(story_idea, min_chars=min_story_chars)
    except Exception as exc:
        return {
            "ok": False,
            "genre_analysis": {"genre": "", "tone": "", "setting": ""},
            "screenplay": "",
            "characters": "",
            "sound_design": "",
            "errors": [str(exc)],
            "meta": {"model": MODEL_NAME},
        }

    client = client or OllamaClient()

    analysis: Optional[GenreToneAnalysis] = None
    screenplay = ""
    characters = ""
    sound_design = ""

    # Genre/tone detection is intentionally low-temperature.
    try:
        analysis = detect_genre_and_tone(story_idea, temperature=0.2, client=client)
    except Exception as exc:
        errors.append(f"Genre detection failed: {exc}")

    try:
        screenplay = generate_screenplay(story_idea, analysis, temperature=temperature, client=client)
    except Exception as exc:
        errors.append(f"Screenplay generation failed: {exc}")

    try:
        characters = generate_character_profiles(story_idea, analysis, temperature=temperature, client=client)
    except Exception as exc:
        errors.append(f"Character generation failed: {exc}")

    try:
        sound_design = generate_sound_design_plan(story_idea, analysis, temperature=temperature, client=client)
    except Exception as exc:
        errors.append(f"Sound design generation failed: {exc}")

    analysis_dict = {
        "genre": analysis.genre if analysis else "",
        "tone": analysis.tone if analysis else "",
        "setting": analysis.setting if analysis else "",
    }

    ok = (len(errors) == 0)
    return {
        "ok": ok,
        "genre_analysis": analysis_dict,
        "screenplay": screenplay,
        "characters": characters,
        "sound_design": sound_design,
        "errors": errors,
        "meta": {
            "model": MODEL_NAME,
            "temperature": _clamp_temperature(temperature),
            "min_story_chars": int(min_story_chars),
        },
    }


def run_full_pipeline_single_call(
    story_idea: str,
    *,
    temperature: float = DEFAULT_TEMPERATURE,
    min_story_chars: int = DEFAULT_MIN_STORY_CHARS,
    client: Optional[OllamaClient] = None,
) -> Dict[str, Any]:
    """Run the complete pipeline in a single model request."""

    errors: list[str] = []

    try:
        story_idea = validate_story_input(story_idea, min_chars=min_story_chars)
    except Exception as exc:
        return {
            "ok": False,
            "genre_analysis": {"genre": "", "tone": "", "setting": ""},
            "screenplay": "",
            "characters": "",
            "sound_design": "",
            "errors": [str(exc)],
            "meta": {"model": MODEL_NAME, "mode": "single_call"},
        }

    client = client or OllamaClient()

    prompt = _build_single_call_prompt(story_idea)
    raw = client.generate_text(
        prompt=prompt,
        temperature=_clamp_temperature(temperature),
        max_output_tokens=8192,
    )

    parsed = _parse_single_call_output(raw)
    errors.extend(parsed["errors"])

    ok = len(errors) == 0
    return {
        "ok": ok,
        "genre_analysis": {
            "genre": parsed.get("genre", ""),
            "tone": parsed.get("tone", ""),
            "setting": parsed.get("setting", ""),
        },
        "screenplay": parsed.get("screenplay", ""),
        "characters": parsed.get("characters", ""),
        "sound_design": parsed.get("sound_design", ""),
        "errors": errors,
        "meta": {
            "model": MODEL_NAME,
            "temperature": _clamp_temperature(temperature),
            "min_story_chars": int(min_story_chars),
            "mode": "single_call",
        },
    }


# -----------------------------
# Prompt builders
# -----------------------------

def _build_genre_detection_prompt(story_idea: str) -> str:
    return (
        "You are a film development analyst.\n"
        "Task: Identify the likely GENRE, TONE, and SETTING of the story idea.\n"
        "Strict rules:\n"
        "- Output MUST be valid JSON only (no markdown, no commentary, no code fences).\n"
        "- JSON keys must be exactly: genre, tone, setting\n"
        "- Values must be short strings (1–6 words each).\n"
        "\n"
        "Return JSON now for this story idea:\n"
        f"{story_idea}\n"
    )


def _build_screenplay_prompt(story_idea: str, analysis: Optional[GenreToneAnalysis]) -> str:
    analysis_block = ""
    if analysis:
        analysis_block = (
            f"Genre: {analysis.genre}\n"
            f"Tone: {analysis.tone}\n"
            f"Setting: {analysis.setting}\n"
        )

    return (
        "You are a professional screenwriter.\n"
        "Write an industry-formatted SCREENPLAY based on the story idea.\n"
        "\n"
        "STRICT FORMAT RULES (MUST FOLLOW):\n"
        "1) NO MARKDOWN. Output plain text only.\n"
        "2) Scene headings MUST be in ALL CAPS and start with INT. or EXT.\n"
        "   Example: INT. ABANDONED THEATRE - NIGHT\n"
        "3) Use standard screenplay blocks: ACTION, CHARACTER, DIALOGUE, PARENTHETICAL, TRANSITIONS.\n"
        "4) CHARACTER NAMES MUST BE UPPERCASE and centered using indentation: 20 leading spaces.\n"
        "   Example line: '                    ALEX'\n"
        "5) Dialogue lines should be indented 12 spaces.\n"
        "6) Parentheticals should be indented 10 spaces and wrapped in parentheses.\n"
        "7) Keep spacing readable and consistent. Preserve line breaks.\n"
        "8) Do not include any explanations, outlines, or bullet lists. Only the screenplay.\n"
        "\n"
        "CONTEXT (use as guidance, not as extra output):\n"
        f"{analysis_block}"
        "\n"
        "STORY IDEA:\n"
        f"{story_idea}\n"
        "\n"
        "Deliver a complete short screenplay (approximately 3–6 scenes).\n"
    )


def _build_character_prompt(story_idea: str, analysis: Optional[GenreToneAnalysis]) -> str:
    analysis_block = ""
    if analysis:
        analysis_block = (
            f"Genre: {analysis.genre}\n"
            f"Tone: {analysis.tone}\n"
            f"Setting: {analysis.setting}\n"
        )

    return (
        "You are a character development specialist for film/TV.\n"
        "Generate DETAILED CHARACTER PROFILES derived from the story idea.\n"
        "\n"
        "STRICT OUTPUT RULES:\n"
        "- NO MARKDOWN. Plain text only.\n"
        "- Create 3 to 6 main characters (no extras list).\n"
        "- Each character must be separated by a clear divider line exactly: '---'\n"
        "- For each character, output these fields EXACTLY with labels:\n"
        "  Name:\n"
        "  Age:\n"
        "  Background:\n"
        "  Psychological Depth:\n"
        "  Motivation:\n"
        "  Internal Conflict:\n"
        "  Character Arc:\n"
        "  Relationships:\n"
        "- Keep each field substantial but concise (2–6 sentences each).\n"
        "- Do not add any other fields. Do not add commentary.\n"
        "\n"
        "CONTEXT:\n"
        f"{analysis_block}"
        "\n"
        "STORY IDEA:\n"
        f"{story_idea}\n"
    )


def _build_sound_design_prompt(story_idea: str, analysis: Optional[GenreToneAnalysis]) -> str:
    analysis_block = ""
    if analysis:
        analysis_block = (
            f"Genre: {analysis.genre}\n"
            f"Tone: {analysis.tone}\n"
            f"Setting: {analysis.setting}\n"
        )

    return (
        "You are a film sound designer and re-recording mixer.\n"
        "Create a SCENE-BASED SOUND DESIGN PLAN for the story idea.\n"
        "\n"
        "STRICT OUTPUT RULES:\n"
        "- NO MARKDOWN. Plain text only.\n"
        "- Provide 3 to 6 scenes.\n"
        "- For each scene, start with a heading exactly like: 'SCENE 1: <short name>'\n"
        "- Under each scene, include these sections EXACTLY with labels in ALL CAPS:\n"
        "  MUSIC GENRE:\n"
        "  AMBIENT SOUND:\n"
        "  FOLEY EFFECTS:\n"
        "  MIXING NOTES:\n"
        "  EMOTIONAL ALIGNMENT:\n"
        "- Each section must be 1–4 sentences (or compact lists in a single line).\n"
        "- Ensure recommendations match the scene mood and overall tone.\n"
        "- Do not add any other sections or commentary.\n"
        "\n"
        "CONTEXT:\n"
        f"{analysis_block}"
        "\n"
        "STORY IDEA:\n"
        f"{story_idea}\n"
    )


def _build_single_call_prompt(story_idea: str) -> str:
    return (
        "You are a professional screenwriter and film development team.\n"
        "Generate ALL outputs in ONE response using the exact markers below.\n"
        "STRICT RULES:\n"
        "- NO markdown. Plain text only.\n"
        "- Use the markers EXACTLY as shown (each marker on its own line).\n"
        "- Do not add extra sections, headers, or commentary.\n"
        "\n"
        "First output 3 single-line fields:\n"
        "GENRE: <1-6 words>\n"
        "TONE: <1-6 words>\n"
        "SETTING: <1-10 words>\n"
        "\n"
        "Then output the content blocks with these markers:\n"
        "===SCREENPLAY===\n"
        "(industry-formatted screenplay, 3–6 scenes, strict screenplay formatting, no bullets)\n"
        "===CHARACTERS===\n"
        "(3–6 characters, plain text, separate each character with a divider line exactly: '---')\n"
        "===SOUND_DESIGN===\n"
        "(3–6 scenes, each scene heading 'SCENE N: <name>' and sections: MUSIC GENRE, AMBIENT SOUND, FOLEY EFFECTS, MIXING NOTES, EMOTIONAL ALIGNMENT)\n"
        "\n"
        "STORY IDEA:\n"
        f"{story_idea}\n"
    )


# -----------------------------
# Utilities
# -----------------------------

def _normalize_newlines(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n")


def _strip_code_fences(text: str) -> str:
    """Remove accidental markdown fences if the model outputs them."""
    t = text.strip()
    # Remove ```...``` wrappers, any language tag.
    if t.startswith("```") and t.endswith("```"):
        t = re.sub(r"^```[a-zA-Z0-9_-]*\n?", "", t)
        t = re.sub(r"\n?```$", "", t)
    return t.strip()


def _clamp_temperature(value: float) -> float:
    try:
        v = float(value)
    except Exception:
        v = DEFAULT_TEMPERATURE
    return max(0.0, min(1.0, v))


def _parse_json_object(text: str) -> Dict[str, Any]:
    """Parse a JSON object from model output.

    The model is instructed to output JSON only, but this function is defensive and can
    extract the first top-level JSON object if extra characters leak.
    """

    raw = _strip_code_fences(_normalize_newlines(text)).strip()

    # Fast path
    try:
        obj = json.loads(raw)
        if isinstance(obj, dict):
            return obj
    except Exception:
        pass

    # Extract first {...} block
    start = raw.find("{")
    if start < 0:
        raise AIEngineError("Failed to parse JSON from genre detection output.")

    # raw_decode parses a JSON value from the beginning of the string and returns
    # (value, end_index). This is ideal if the model leaks trailing commentary.
    decoder = json.JSONDecoder()
    try:
        obj, _end = decoder.raw_decode(raw[start:])
    except Exception as exc:
        raise AIEngineError("Genre detection returned invalid JSON.") from exc

    if not isinstance(obj, dict):
        raise AIEngineError("Genre detection JSON must be an object.")

    return obj


def _clean_scalar(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return ""
    return str(value).strip()


def _parse_single_call_output(text: str) -> Dict[str, Any]:
    raw = _strip_code_fences(_normalize_newlines(text)).strip()

    errors: list[str] = []

    def find_field(label: str) -> str:
        m = re.search(rf"^{re.escape(label)}\s*:\s*(.+)\s*$", raw, flags=re.MULTILINE)
        return (m.group(1).strip() if m else "")

    genre = find_field("GENRE")
    tone = find_field("TONE")
    setting = find_field("SETTING")

    s_idx = raw.find("===SCREENPLAY===")
    c_idx = raw.find("===CHARACTERS===")
    d_idx = raw.find("===SOUND_DESIGN===")

    screenplay = ""
    characters = ""
    sound_design = ""

    if s_idx < 0 or c_idx < 0 or d_idx < 0:
        errors.append("Single-call output missing one or more required markers.")
    else:
        screenplay = raw[s_idx + len("===SCREENPLAY==="):c_idx].strip("\n ")
        characters = raw[c_idx + len("===CHARACTERS==="):d_idx].strip("\n ")
        sound_design = raw[d_idx + len("===SOUND_DESIGN==="):].strip("\n ")

    if not genre:
        errors.append("Single-call output missing GENRE.")
    if not tone:
        errors.append("Single-call output missing TONE.")
    if not setting:
        errors.append("Single-call output missing SETTING.")
    if not screenplay:
        errors.append("Single-call output missing SCREENPLAY content.")
    if not characters:
        errors.append("Single-call output missing CHARACTERS content.")
    if not sound_design:
        errors.append("Single-call output missing SOUND_DESIGN content.")

    return {
        "genre": genre,
        "tone": tone,
        "setting": setting,
        "screenplay": screenplay,
        "characters": characters,
        "sound_design": sound_design,
        "errors": errors,
    }
