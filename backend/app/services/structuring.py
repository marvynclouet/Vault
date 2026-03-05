import json

from openai import AsyncOpenAI

from app.config import settings
from app.models import AnalyzeResponse, ProjectPayload

client = AsyncOpenAI(api_key=settings.openai_api_key)

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

ANALYZE_PROMPT = """Tu es un Product Owner senior, Chef de Projet et PM expérimenté avec 15 ans d'expérience.

On te soumet une idée de projet dictée à la voix (texte brut, potentiellement brouillon). Tu dois :

1. **Comprendre l'idée** : Extrais le nom du projet et un résumé clair.

2. **Donner ton avis honnête** (review) :
   - verdict : "go" (fonce), "pivot" (bonne idée mais à ajuster), ou "drop" (mauvaise idée, explique pourquoi)
   - confidence : score de 1 à 10 sur la viabilité
   - strengths : 2-4 points forts de l'idée
   - risks : 2-4 risques identifiés
   - suggestions : 2-4 recommandations concrètes pour améliorer le projet
   - one_liner : une phrase d'accroche résumant ton verdict (style direct, comme un mentor)

3. **Découper en tâches** : Si le verdict est "go" ou "pivot", propose un plan d'action concret avec des tâches. Pour chaque tâche :
   - title, description, assignee_role, priority ("Haute"/"Moyenne"/"Basse"), action_target ("Trello" par défaut)

Sois direct, constructif, et honnête. Pas de langue de bois. Tu parles comme un mentor exigeant mais bienveillant.

Format de sortie STRICTEMENT en JSON :
{
  "project_name": "...",
  "summary": "...",
  "review": {
    "verdict": "go|pivot|drop",
    "confidence": 7,
    "strengths": ["...", "..."],
    "risks": ["...", "..."],
    "suggestions": ["...", "..."],
    "one_liner": "..."
  },
  "tasks": [{"title": "...", "description": "...", "assignee_role": "...", "priority": "...", "action_target": "Trello"}]
}"""


async def structure_transcript(transcript: str) -> ProjectPayload:
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
    response = await client.chat.completions.create(
        model=settings.llm_model,
        messages=[
            {"role": "system", "content": ANALYZE_PROMPT},
            {"role": "user", "content": transcript},
        ],
        response_format={"type": "json_object"},
        temperature=0.4,
    )

    raw = response.choices[0].message.content
    data = json.loads(raw)
    return AnalyzeResponse(**data)
