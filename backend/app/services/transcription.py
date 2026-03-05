import re
from pathlib import Path
from typing import Optional, Tuple

from openai import AsyncOpenAI

from app.config import settings

# Langues acceptées (français, anglais uniquement - public francophone)
ALLOWED_LANGUAGES = {"fr", "en", "french", "english"}

# Patterns indiquant un audio inaudible ou incompréhensible
INAUDIBLE_PATTERNS = [
    r"^\[?\s*silence\s*\]?$",
    r"^\[?\s*inaudible\s*\]?$",
    r"^\[?\s*music\s*\]?$",
    r"^\[?\s*inaudible\s*\]?$",
    r"^\[?\s*\[.*\]\s*\]?$",  # [blabla] seul
    r"^\.{1,}$",
    r"^\-+$",
]
INAUDIBLE_RE = re.compile("|".join(INAUDIBLE_PATTERNS), re.IGNORECASE)
MIN_MEANINGFUL_LENGTH = 12  # caractères minimum pour un transcript valide


def _get_client():
    if settings.ai_provider == "groq":
        return AsyncOpenAI(
            api_key=settings.groq_api_key,
            base_url="https://api.groq.com/openai/v1",
        )
    return AsyncOpenAI(api_key=settings.openai_api_key)


def _get_model():
    if settings.ai_provider == "groq":
        return settings.whisper_model or "whisper-large-v3-turbo"
    return settings.whisper_model or "whisper-1"


def _is_inaudible(text: str) -> bool:
    """Détecte si le transcript indique un audio inaudible ou incompréhensible."""
    t = (text or "").strip()
    if not t:
        return True
    if len(t) < MIN_MEANINGFUL_LENGTH:
        return True
    if INAUDIBLE_RE.match(t):
        return True
    # Trop de caractères non alphabétiques
    alpha = sum(1 for c in t if c.isalpha())
    if alpha < len(t) * 0.3:
        return True
    return False


def _normalize_lang(lang: Optional[str]) -> Optional[str]:
    """Normalise le code langue (ex: 'french' -> 'fr')."""
    if not lang:
        return None
    lang = lang.lower().strip()
    if lang in ("fr", "french"):
        return "fr"
    if lang in ("en", "english"):
        return "en"
    return lang


def _is_allowed_language(lang: Optional[str]) -> bool:
    return _normalize_lang(lang) in ("fr", "en")


async def transcribe_audio(audio_path: Path) -> str:
    """Transcription simple (sans validation). Pour les chunks en direct."""
    client = _get_client()
    model = _get_model()
    with open(audio_path, "rb") as audio_file:
        response = await client.audio.transcriptions.create(
            model=model,
            file=audio_file,
            response_format="text",
        )
    return (response if isinstance(response, str) else getattr(response, "text", "") or "").strip()


async def transcribe_audio_validated(audio_path: Path) -> Tuple[str, Optional[str]]:
    """
    Transcrit l'audio et valide :
    - langue FR ou EN uniquement
    - audio audible et compréhensible
    Lève ValueError avec code 'inaudible' ou 'language' en cas de problème.
    """
    client = _get_client()
    model = _get_model()

    with open(audio_path, "rb") as audio_file:
        response = await client.audio.transcriptions.create(
            model=model,
            file=audio_file,
            response_format="verbose_json",
        )

    # Support both object and dict (OpenAI/Groq compatibility)
    text = (getattr(response, "text", None) or (response.get("text") if isinstance(response, dict) else None) or "").strip()
    lang = (getattr(response, "language", None) or (response.get("language") if isinstance(response, dict) else None) or "")

    if _is_inaudible(text):
        raise ValueError(
            "inaudible: Ton audio est inaudible ou incompréhensible. Vérifie ton micro, parle plus près et réessaie."
        )

    if not _is_allowed_language(lang):
        raise ValueError(
            "language: Vault-PM accepte uniquement le français ou l'anglais. Parle dans l'une de ces langues."
        )

    return text, _normalize_lang(lang) or "fr"
