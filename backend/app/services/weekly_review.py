"""Génère la revue hebdomadaire PM IA à partir des projets de l'utilisateur."""
import json
from datetime import datetime, timedelta
from typing import List

from openai import AsyncOpenAI

from app.config import settings

WEEKLY_REVIEW_PROMPT = """Tu es un PM IA expert qui fait la revue hebdomadaire d'un entrepreneur/freelance.

Données de la semaine :
{data}

Génère une revue hebdomadaire percutante et actionnable. Sois direct, honnête, sans flatterie.

Réponds UNIQUEMENT en JSON valide :
{{
  "headline": "une phrase percutante résumant la semaine (max 10 mots, style coup de poing)",
  "score": 0-10,
  "highlights": ["réalisation concrète 1", "réalisation concrète 2"],
  "stuck": ["point bloquant avec suggestion courte de déblocage"],
  "next_week": ["priorité actionnable 1", "priorité actionnable 2", "priorité actionnable 3"],
  "motivation": "message court de motivation personnalisé et direct (1 phrase)"
}}

Règles :
- Si peu d'activité : dire clairement que la semaine a été calme et proposer comment reprendre
- highlights peut être vide si aucune réalisation notable
- next_week doit être concret et réalisable la semaine prochaine
- Réponds en français
"""


def _get_client():
    if settings.ai_provider == "groq":
        return AsyncOpenAI(api_key=settings.groq_api_key, base_url="https://api.groq.com/openai/v1")
    return AsyncOpenAI(api_key=settings.openai_api_key)


async def generate_weekly_review(projects: List[dict]) -> dict:
    client = _get_client()

    now = datetime.utcnow()
    week_ago = (now - timedelta(days=7)).isoformat()

    new_this_week = [p for p in projects if p.get("created_at", "") >= week_ago]

    completed_tasks = []
    dormant_projects = []
    pending_tasks_total = 0

    for p in projects:
        tasks = p.get("tasks", [])
        pending = [t for t in tasks if t.get("status", "todo") != "done"]
        pending_tasks_total += len(pending)

        for t in tasks:
            ca = t.get("completed_at")
            if ca and ca >= week_ago:
                completed_tasks.append({"title": t.get("title", ""), "project": p.get("project_name", "")})

        if pending:
            last_activity = p.get("created_at", "") or ""
            for t in tasks:
                ca = t.get("completed_at") or ""
                if ca > last_activity:
                    last_activity = ca
            age_days = (now - datetime.fromisoformat(last_activity.replace("Z", ""))).days if last_activity else 99
            if age_days >= 5:
                dormant_projects.append(p.get("project_name", "Projet sans nom"))

    project_summaries = "; ".join(
        f"{p['project_name']} (verdict: {p.get('review', {}).get('verdict', '?')}, {len(p.get('tasks', []))} tâches)"
        for p in projects[:6]
    ) or "aucun projet"

    data = f"""
- Projets créés cette semaine : {len(new_this_week)} ({', '.join(p['project_name'] for p in new_this_week) or 'aucun'})
- Tâches complétées cette semaine : {len(completed_tasks)} ({', '.join(t['title'] for t in completed_tasks[:4]) or 'aucune'})
- Tâches en attente au total : {pending_tasks_total}
- Projets dormants (5j+ sans activité) : {', '.join(dormant_projects) or 'aucun'}
- Portfolio projets : {project_summaries}
"""

    response = await client.chat.completions.create(
        model=settings.llm_model,
        messages=[{"role": "user", "content": WEEKLY_REVIEW_PROMPT.format(data=data)}],
        response_format={"type": "json_object"},
        temperature=0.5,
    )

    return json.loads(response.choices[0].message.content)
