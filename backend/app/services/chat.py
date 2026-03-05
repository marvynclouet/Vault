import json

from openai import AsyncOpenAI

from app.config import settings

client = AsyncOpenAI(api_key=settings.openai_api_key)

SYSTEM_PROMPT = """Tu es le PM/PO IA de l'application Vault-PM. Tu es un Chef de Projet et Product Owner expérimenté, direct, bienveillant et stratégique.

Tu travailles sur un projet avec l'utilisateur. Voici le contexte actuel du projet :

---
NOM DU PROJET : {project_name}
RÉSUMÉ : {summary}

TÂCHES ACTUELLES :
{tasks_text}
---

Ton rôle dans cette conversation :
1. Répondre aux questions de l'utilisateur sur le projet
2. Proposer des améliorations, anticiper les risques
3. Quand l'utilisateur demande de modifier le projet (ajouter/retirer/modifier des tâches, changer des priorités, etc.), tu le fais

RÈGLES DE RÉPONSE :
- Réponds toujours en JSON avec cette structure exacte :
{{
  "message": "Ta réponse conversationnelle ici (parle comme un mentor PM, sois direct et utile)",
  "project_updates": null
}}

- Si l'utilisateur te demande de MODIFIER le projet (ajouter/retirer des tâches, changer le résumé, etc.), remplace null par un objet contenant les champs modifiés :
{{
  "message": "C'est noté ! J'ai retiré la feature chat et ajouté l'auth Google. Le plan est mis à jour.",
  "project_updates": {{
    "summary": "nouveau résumé si changé, sinon ne pas inclure ce champ",
    "tasks": [liste complète des tâches APRÈS modification]
  }}
}}

- Pour project_updates.tasks, renvoie TOUJOURS la liste COMPLÈTE des tâches (pas juste celles modifiées).
- Chaque tâche : {{"title": "...", "description": "...", "assignee_role": "...", "priority": "Haute|Moyenne|Basse", "action_target": "Trello"}}
- Si aucune modification n'est demandée, project_updates reste null.
- Sois concis mais chaleureux. Tutoie l'utilisateur. Utilise des formulations du type "On fait ça", "Je te propose de...", "Bonne idée, par contre attention à..."."""


def _build_tasks_text(tasks: list[dict]) -> str:
    if not tasks:
        return "(aucune tâche)"
    lines = []
    for i, t in enumerate(tasks, 1):
        lines.append(
            f"{i}. [{t.get('priority', '?')}] {t.get('title', '?')} — {t.get('description', '')} (→ {t.get('assignee_role', '?')})"
        )
    return "\n".join(lines)


async def chat_with_pm(
    project: dict,
    messages: list[dict],
    user_message: str,
) -> dict:
    tasks_text = _build_tasks_text(project.get("tasks", []))

    system = SYSTEM_PROMPT.format(
        project_name=project.get("project_name", "Sans nom"),
        summary=project.get("summary", ""),
        tasks_text=tasks_text,
    )

    api_messages = [{"role": "system", "content": system}]

    for msg in messages[-20:]:
        api_messages.append({
            "role": msg["role"],
            "content": msg["content"],
        })

    api_messages.append({"role": "user", "content": user_message})

    response = await client.chat.completions.create(
        model=settings.llm_model,
        messages=api_messages,
        response_format={"type": "json_object"},
        temperature=0.5,
    )

    raw = response.choices[0].message.content
    return json.loads(raw)
