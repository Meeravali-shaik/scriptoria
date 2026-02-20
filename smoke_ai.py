from __future__ import annotations

from dotenv import load_dotenv


def main() -> None:
    load_dotenv()

    import ai_engine  # local

    print("AI_ENGINE_IMPORT_OK")

    story = (
        "A lonely projectionist discovers every reel changes reality, but each change costs him a cherished memory. "
        "When the final reel reveals his own life as a film, he must choose between restoring the world "
        "or keeping the person he loves."
    )

    ai_engine.validate_story_input(story, min_chars=20)
    print("VALIDATED_OK")

    client = ai_engine.OllamaClient()
    print("CLIENT_OK", "base_url=", getattr(client, "base_url", None), "model=", getattr(client, "model", None))

    try:
        out = client.generate_text(
            prompt="Reply with exactly: OK",
            temperature=0.0,
            max_output_tokens=16,
            retries=0,
        )
        print("GEN_OK:", out)
    except Exception as exc:
        print("GEN_FAIL:", str(exc))


if __name__ == "__main__":
    main()
