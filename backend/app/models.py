from typing import List, Optional

from pydantic import BaseModel


class Task(BaseModel):
    title: str
    description: str
    assignee_role: str
    priority: str
    action_target: str = "Trello"
    status: str = "todo"  # todo | in_progress | done
    due_date: Optional[str] = None  # ISO date
    completed_at: Optional[str] = None  # ISO datetime
    order: int = 0


class ProjectPayload(BaseModel):
    project_name: str
    summary: str
    tasks: List[Task]
    slack_message: str = ""


class AiReview(BaseModel):
    verdict: str
    confidence: int
    strengths: List[str] = []
    risks: List[str] = []
    suggestions: List[str] = []
    one_liner: str
    # Scoring PM Expert (optionnel)
    score_clarity: Optional[int] = None
    score_market: Optional[int] = None
    score_feasibility: Optional[int] = None
    score_competitive: Optional[int] = None
    score_global: Optional[int] = None


class AnalyzeResponse(BaseModel):
    project_name: str
    summary: str
    review: AiReview
    tasks: List[Task]
    # Champs enrichis PM Expert (optionnels, stockés dans review jsonb)
    vision: Optional[str] = None
    mvp_summary: Optional[str] = None


class TranscriptRequest(BaseModel):
    transcript: str


class PipelineResponse(BaseModel):
    transcript: str
    project: ProjectPayload
    trello_cards_created: Optional[List[dict]] = None
    webhook_sent: bool = False
