"""
Service pour mettre à jour un projet existant via une nouvelle dictée.
Fusionne le transcript avec le contexte du projet.
"""
import json

from openai import AsyncOpenAI

from app.config import settings
from app.prompts import get_system_prompt_pm

UPDATE_PROMPT = """Tu es un PM expert. Un projet EXISTANT a été mis à jour par une nouvelle dictée de l'utilisateur.

PROJET ACTUEL :
- Nom : {project_name}
- Résumé : {summary}
- Tâches : {tasks_json}

NOUVELLE DICTÉE (mise à jour) :
{new_transcript}

Consignes :
1. Fusionne les infos. La nouvelle dictée PRIME sur l'ancienne pour les conflits.
2. Mets à jour le résumé si pertinent.
3. Ajoute/modifie/supprime des tâches selon la dictée. Garde status, due_date, completed_at des tâches existantes si non mentionnées.
4. Recalcule le verdict (go/pivot/drop) et la review si nécessaire.
5. Renvoie UNIQUEMENT un JSON valide avec : project_name, summary, review, tasks.
6. Chaque tâche doit avoir : title, description, assignee_role, priority, action_target, status, due_date, completed_at, order."""


async def update_project_from_transcript(
    project_name: str,
    summary: str,
    tasks: list,
    transcript: str,
) -> dict:
    if settings.ai_provider == "groq":
        client = AsyncOpenAI(api_key=settings.groq_api_key, base_url="https://api.groq.com/openai/v1")
    else:
        client = AsyncOpenAI(api_key=settings.openai_api_key)

    tasks_json = json.dumps(tasks, ensure_ascii=False, indent=2)

    prompt = UPDATE_PROMPT.format(
        project_name=project_name,
        summary=summary,
        tasks_json=tasks_json,
        new_transcript=transcript,
    )

    response = await client.chat.completions.create(
        model=settings.llm_model,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.3,
    )

    data = json.loads(response.choices[0].message.content)

    # Normaliser les tâches
    for i, t in enumerate(data.get("tasks", [])):
        t.setdefault("status", "todo")
        t.setdefault("due_date", None)
        t.setdefault("completed_at", None)
        t.setdefault("order", i)

    return data
