from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import CurrentUser, get_current_user
from app.llm_router import analyze_project

router = APIRouter(prefix="/api/v1", tags=["analysis"])


class AnalysisRequest(BaseModel):
    transcript: str
    project_id: Optional[str] = None


class AnalysisResponse(BaseModel):
    data: dict
    engine: str
    degraded: bool


@router.post("/analyze", response_model=AnalysisResponse)
async def create_analysis(
    request: AnalysisRequest,
    user: CurrentUser = Depends(get_current_user),
):
    if not request.transcript.strip():
        raise HTTPException(400, "Le transcript est vide")

    if len(request.transcript) > 5000:
        raise HTTPException(400, "Le transcript est trop long (max 5000 caractères)")

    result = await analyze_project(
        user_input=request.transcript,
        user_plan=user.plan,
    )

    # TODO: sauvegarder l'analyse dans Supabase
    # await save_analysis(user.id, request.project_id, result)

    return AnalysisResponse(**result)
