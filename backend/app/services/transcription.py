from pathlib import Path

from openai import AsyncOpenAI

from app.config import settings

client = AsyncOpenAI(api_key=settings.openai_api_key)


async def transcribe_audio(audio_path: Path) -> str:
    with open(audio_path, "rb") as audio_file:
        response = await client.audio.transcriptions.create(
            model=settings.whisper_model,
            file=audio_file,
            response_format="text",
        )
    return response.strip()
