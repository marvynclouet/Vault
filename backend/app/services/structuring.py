import json

from openai import AsyncOpenAI

from app.config import settings
from app.models import AnalyzeResponse, ProjectPayload
from app.prompts import get_system_prompt_pm

def _get_client():
    if settings.ai_provider == "groq":
        return AsyncOpenAI(
            api_key=settings.groq_api_key,
            base_url="https://api.groq.com/openai/v1",
        )
    return AsyncOpenAI(api_key=settings.openai_api_key)

STRUCTURE_PROMPT = """Tu es un Scrum Master expert et chef de projet senior.

Analyse le texte fourni par l'utilisateur. C'est une description brouillonne d'un projet dictée à la voix.

Ton travail :
1. Extrais un nom de projet clair et concis.
2. Rédige un résumé professionnel en 1-2 phrases.
3. Découpe le contenu en tâches actionnables. Pour chaque tâche :
   - title : un titre court et clair
   - description : ce qu'il faut faire concrètement
   - assignee_role : le rôle concerné (Designer, Developer, Marketing, Chef de Projet, etc.)
   - priority : "Haute", "Moyenne" ou "Basse"
   - action_target : "Trello" (par défaut)
4. Génère un message Slack résumant le lancement du projet.

Règles strictes :
- Renvoie UNIQUEMENT un objet JSON valide, sans texte avant ou après.
- Chaque tâche doit être concrète et réalisable.
- Si le texte est vague, fais de ton mieux pour inférer les tâches logiques.
- Minimum 2 tâches, maximum 15 tâches.
- Les priorités doivent refléter l'urgence et l'impact."""

# Instructions JSON pour l'API (complètent le system prompt PM)
ANALYZE_JSON_FORMAT = """

### Format de sortie pour l'API (OBLIGATOIRE)
Tu dois renvoyer UNIQUEMENT un objet JSON valide, sans texte avant ou après. Structure :

{
  "project_name": "nom du projet",
  "summary": "résumé en 1-2 phrases",
  "vision": "vision claire reformulée (optionnel)",
  "mvp_summary": "MVP en 2-4 semaines (optionnel)",
  "review": {
    "verdict": "go|pivot|drop",
    "confidence": 7,
    "strengths": ["...", "..."],
    "risks": ["...", "..."],
    "suggestions": ["...", "..."],
    "one_liner": "phrase d'accroche",
    "score_clarity": 7,
    "score_market": 6,
    "score_feasibility": 8,
    "score_competitive": 5,
    "score_global": 26
  },
  "tasks": [
    {"title": "...", "description": "...", "assignee_role": "...", "priority": "Haute|Moyenne|Basse", "action_target": "Trello", "status": "todo", "due_date": null, "completed_at": null, "order": 0}
  ]
}

- verdict : "go" (fonce), "pivot" (à ajuster), "drop" (stop)
- score_* : 0-10 chacun, score_global = somme des 4 (max 40)
- tasks : minimum 2, maximum 15. Chaque tâche doit avoir status:"todo", due_date:null, completed_at:null, order:0. Priorité MoSCoW si possible (Must/Should/Could)
"""


async def structure_transcript(transcript: str) -> ProjectPayload:
    client = _get_client()
    response = await client.chat.completions.create(
        model=settings.llm_model,
        messages=[
            {"role": "system", "content": STRUCTURE_PROMPT},
            {"role": "user", "content": transcript},
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
    )

    raw = response.choices[0].message.content
    data = json.loads(raw)
    return ProjectPayload(**data)


async def analyze_transcript(transcript: str) -> AnalyzeResponse:
    """Analyse une transcription avec le PM Expert (system prompt + base de connaissances)."""
    client = _get_client()
    system_prompt = get_system_prompt_pm() + ANALYZE_JSON_FORMAT
    user_content = (
        f"Voici la transcription vocale d'une idée de projet :\n\n{transcript}\n\n"
        "Analyse ce projet selon ta méthodologie. Réponds UNIQUEMENT en JSON."
    )

    response = await client.chat.completions.create(
        model=settings.llm_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        response_format={"type": "json_object"},
        temperature=0.4,
    )

    raw = response.choices[0].message.content
    data = json.loads(raw)

    # Normaliser verdict (go/pivot/drop) pour compatibilité frontend
    review = data.get("review", {})
    verdict = review.get("verdict", "go").lower()
    if verdict in ("go", "✅"):
        review["verdict"] = "go"
    elif verdict in ("pivot", "🔄"):
        review["verdict"] = "pivot"
    elif verdict in ("stop", "🛑", "drop"):
        review["verdict"] = "drop"
    data["review"] = review

    return AnalyzeResponse(**data)
