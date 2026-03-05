import tempfile
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.config import settings
from app.models import (
    AnalyzeResponse,
    PipelineResponse,
    ProjectPayload,
    TranscriptRequest,
)
from app.services.chat import chat_with_pm
from app.services.structuring import analyze_transcript, structure_transcript
from app.services.transcription import transcribe_audio
from app.services.trello import create_trello_cards, get_boards, get_lists
from app.services.webhook import send_webhook

app = FastAPI(
    title="Vault-PM",
    description="Pipeline IA : Voix → Analyse PM → Tâches structurées",
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_AUDIO = {".wav", ".m4a", ".mp3", ".webm", ".ogg", ".mp4"}


def _check_audio_suffix(filename: Optional[str]) -> str:
    suffix = Path(filename or "audio.webm").suffix.lower()
    if suffix not in ALLOWED_AUDIO:
        raise HTTPException(400, f"Format audio non supporté : {suffix}")
    return suffix


async def _save_and_transcribe(file: UploadFile) -> str:
    suffix = _check_audio_suffix(file.filename)
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = Path(tmp.name)
    try:
        return await transcribe_audio(tmp_path)
    finally:
        tmp_path.unlink(missing_ok=True)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.3.0"}


@app.post("/api/transcribe")
async def api_transcribe(file: UploadFile) -> dict:
    transcript = await _save_and_transcribe(file)
    return {"transcript": transcript}


@app.post("/api/structure")
async def api_structure(req: TranscriptRequest) -> ProjectPayload:
    if not req.transcript.strip():
        raise HTTPException(400, "Le transcript est vide.")
    return await structure_transcript(req.transcript)


@app.post("/api/analyze")
async def api_analyze(req: TranscriptRequest) -> AnalyzeResponse:
    if not req.transcript.strip():
        raise HTTPException(400, "Le transcript est vide.")
    return await analyze_transcript(req.transcript)


@app.post("/api/analyze/audio")
async def api_analyze_audio(file: UploadFile) -> dict:
    transcript = await _save_and_transcribe(file)
    analysis = await analyze_transcript(transcript)
    return {"transcript": transcript, "analysis": analysis.model_dump()}


class ChatRequest(BaseModel):
    project: Dict
    messages: List[Dict]
    user_message: str


class ChatResponse(BaseModel):
    message: str
    project_updates: Optional[Dict] = None


@app.post("/api/chat")
async def api_chat(req: ChatRequest) -> ChatResponse:
    if not req.user_message.strip():
        raise HTTPException(400, "Le message est vide.")
    result = await chat_with_pm(req.project, req.messages, req.user_message)
    return ChatResponse(**result)


@app.post("/api/pipeline")
async def api_pipeline(file: UploadFile) -> PipelineResponse:
    transcript = await _save_and_transcribe(file)
    project = await structure_transcript(transcript)

    trello_cards = None
    if settings.trello_api_key and settings.trello_list_id:
        try:
            trello_cards = await create_trello_cards(project)
        except Exception as e:
            print(f"[Trello Error] {e}")

    webhook_sent = False
    if settings.webhook_url:
        try:
            webhook_sent = await send_webhook(project)
        except Exception as e:
            print(f"[Webhook Error] {e}")

    return PipelineResponse(
        transcript=transcript,
        project=project,
        trello_cards_created=trello_cards,
        webhook_sent=webhook_sent,
    )


@app.post("/api/push/trello")
async def api_push_trello(project: ProjectPayload) -> dict:
    if not settings.trello_api_key:
        raise HTTPException(400, "Clés API Trello non configurées.")
    cards = await create_trello_cards(project)
    return {"cards_created": cards}


@app.get("/api/trello/boards")
async def api_trello_boards():
    if not settings.trello_api_key:
        raise HTTPException(400, "Clés API Trello non configurées.")
    return await get_boards()


@app.get("/api/trello/boards/{board_id}/lists")
async def api_trello_lists(board_id: str):
    if not settings.trello_api_key:
        raise HTTPException(400, "Clés API Trello non configurées.")
    return await get_lists(board_id)
