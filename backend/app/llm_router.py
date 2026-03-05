"""
Multi-model LLM routing with graceful degradation.
- Payant (solo/agence/incubateur) : Groq 70B → fallback OpenAI gpt-4o-mini
- Gratuit : Groq 70B → fallback Groq 8B (best effort)
"""
import json
import sys
from pathlib import Path

# Ajouter backend au path pour importer prompts
_backend = Path(__file__).resolve().parent.parent
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

from openai import AsyncOpenAI

from app.config import settings

# Import prompts (depuis backend/prompts)
from prompts.system_prompt_pm import SYSTEM_PROMPT
from prompts.few_shots import FEW_SHOTS


def _groq_client():
    return AsyncOpenAI(
        api_key=settings.groq_api_key,
        base_url="https://api.groq.com/openai/v1",
    )


def _openai_client():
    return AsyncOpenAI(api_key=settings.openai_api_key)


async def analyze_project(user_input: str, user_plan: str = "free"):
    """
    Multi-model routing with graceful degradation.
    """
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *FEW_SHOTS,
        {"role": "user", "content": user_input},
    ]

    # Tier 1 : Groq Llama 3.3 70B
    try:
        client = _groq_client()
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.3,
            max_tokens=4000,
            response_format={"type": "json_object"},
        )
        return {
            "data": json.loads(response.choices[0].message.content),
            "engine": "groq-70b",
            "degraded": False,
        }
    except Exception as e:
        print(f"[LLM] Groq 70B failed: {e}")

        # Tier 2 : selon le plan
        if user_plan in ("solo", "agence", "incubateur"):
            # Client payant → OpenAI fallback (qualité garantie)
            try:
                client = _openai_client()
                if not client.api_key:
                    raise ValueError("OPENAI_API_KEY non configurée")
                response = await client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messages,
                    temperature=0.3,
                    max_tokens=4000,
                    response_format={"type": "json_object"},
                )
                return {
                    "data": json.loads(response.choices[0].message.content),
                    "engine": "openai-4o-mini",
                    "degraded": False,
                }
            except Exception as e2:
                print(f"[LLM] OpenAI fallback failed: {e2}")
                raise Exception("Tous les providers sont down")
        else:
            # Plan gratuit → Groq 8B (best effort)
            try:
                client = _groq_client()
                response = await client.chat.completions.create(
                    model="llama-3.1-8b-instant",
                    messages=messages,
                    temperature=0.3,
                    max_tokens=4000,
                    response_format={"type": "json_object"},
                )
                return {
                    "data": json.loads(response.choices[0].message.content),
                    "engine": "groq-8b",
                    "degraded": True,
                }
            except Exception as e3:
                print(f"[LLM] Groq 8B failed: {e3}")
                raise Exception("Service temporairement indisponible")
