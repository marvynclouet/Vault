import httpx

from app.config import settings
from app.models import ProjectPayload


async def send_webhook(project: ProjectPayload) -> bool:
    """Send the structured project payload to an external webhook (n8n, Make.com, etc.)."""
    if not settings.webhook_url:
        return False

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            settings.webhook_url,
            json=project.model_dump(),
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()
        return True
