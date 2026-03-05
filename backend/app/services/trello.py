import httpx

from app.config import settings
from app.models import ProjectPayload

TRELLO_API_BASE = "https://api.trello.com/1"

PRIORITY_LABELS = {
    "Haute": "red",
    "Moyenne": "yellow",
    "Basse": "green",
}


async def create_trello_cards(project: ProjectPayload) -> list[dict]:
    created = []
    async with httpx.AsyncClient(timeout=30) as client:
        for task in project.tasks:
            if task.action_target.lower() != "trello":
                continue

            label_color = PRIORITY_LABELS.get(task.priority, "blue")

            response = await client.post(
                f"{TRELLO_API_BASE}/cards",
                params={
                    "key": settings.trello_api_key,
                    "token": settings.trello_api_token,
                    "idList": settings.trello_list_id,
                    "name": f"[{task.priority}] {task.title}",
                    "desc": (
                        f"**Projet :** {project.project_name}\n\n"
                        f"**Description :** {task.description}\n\n"
                        f"**Assigné à :** {task.assignee_role}\n\n"
                        f"**Priorité :** {task.priority}"
                    ),
                },
            )
            response.raise_for_status()
            card_data = response.json()
            created.append(
                {
                    "id": card_data["id"],
                    "name": card_data["name"],
                    "url": card_data["shortUrl"],
                }
            )

    return created


async def get_boards() -> list[dict]:
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(
            f"{TRELLO_API_BASE}/members/me/boards",
            params={
                "key": settings.trello_api_key,
                "token": settings.trello_api_token,
                "fields": "name,url",
            },
        )
        response.raise_for_status()
        return response.json()


async def get_lists(board_id: str) -> list[dict]:
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(
            f"{TRELLO_API_BASE}/boards/{board_id}/lists",
            params={
                "key": settings.trello_api_key,
                "token": settings.trello_api_token,
                "fields": "name",
            },
        )
        response.raise_for_status()
        return response.json()
