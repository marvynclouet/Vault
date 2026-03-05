from typing import List, Optional

from pydantic import BaseModel


class Task(BaseModel):
    title: str
    description: str
    assignee_role: str
    priority: str
    action_target: str = "Trello"


class ProjectPayload(BaseModel):
    project_name: str
    summary: str
    tasks: List[Task]
    slack_message: str = ""


class AiReview(BaseModel):
    verdict: str
    confidence: int
    strengths: List[str]
    risks: List[str]
    suggestions: List[str]
    one_liner: str


class AnalyzeResponse(BaseModel):
    project_name: str
    summary: str
    review: AiReview
    tasks: List[Task]


class TranscriptRequest(BaseModel):
    transcript: str


class PipelineResponse(BaseModel):
    transcript: str
    project: ProjectPayload
    trello_cards_created: Optional[List[dict]] = None
    webhook_sent: bool = False
