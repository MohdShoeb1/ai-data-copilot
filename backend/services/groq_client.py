"""
Groq API client — wraps groq Python SDK.
Client is created lazily so .env is already loaded.
"""
import os
import logging
from typing import Optional, List, Dict

logger = logging.getLogger(__name__)

MODEL = "llama-3.3-70b-versatile"
FALLBACK_MODEL = "llama-3.1-8b-instant"

_client = None


def _get_client():
    """Lazy init — ensures .env is loaded before reading key."""
    global _client
    if _client is not None:
        return _client
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key or api_key == "your_groq_api_key_here":
        logger.warning("GROQ_API_KEY not set or still placeholder!")
        return None
    try:
        from groq import Groq
        _client = Groq(api_key=api_key)
        logger.info(f"Groq client initialized. Key starts with: {api_key[:8]}...")
        return _client
    except Exception as e:
        logger.error(f"Failed to init Groq client: {e}")
        return None


def call_groq(
    prompt: str,
    system: str = "You are a helpful data analyst assistant.",
    messages: Optional[List[Dict]] = None,
    max_tokens: int = 1024,
) -> Optional[str]:
    client = _get_client()
    if client is None:
        logger.warning("Groq client unavailable — returning None")
        return None

    full_messages = [{"role": "system", "content": system}]
    if messages:
        full_messages.extend(messages)
    full_messages.append({"role": "user", "content": prompt})

    for model in (MODEL, FALLBACK_MODEL):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=full_messages,
                max_tokens=max_tokens,
                temperature=0.3,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Groq error with model {model}: {e}")
            err = str(e).lower()
            if "rate" in err or "limit" in err:
                import time
                time.sleep(2)
            continue
    return None
