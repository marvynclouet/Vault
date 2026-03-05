"""
Auth stub pour l'API. À remplacer par Supabase JWT validation.
"""
from typing import Optional

from fastapi import Header, HTTPException


class CurrentUser:
    def __init__(self, user_id: str = "anonymous", plan: str = "free"):
        self.id = user_id
        self.plan = plan  # "free" | "solo" | "agence" | "incubateur"


async def get_current_user(
    authorization: Optional[str] = Header(None),
) -> CurrentUser:
    """
    Extrait l'utilisateur du header Authorization.
    TODO: Valider le JWT Supabase et récupérer le plan depuis la BDD.
    Pour l'instant, retourne un user anonyme en plan "free".
    """
    # Si Authorization présente, on pourrait parser le JWT Supabase
    # if authorization and authorization.startswith("Bearer "):
    #     token = authorization[7:]
    #     # Valider avec Supabase, récupérer user_id et plan
    #     return CurrentUser(user_id="...", plan="solo")
    return CurrentUser(plan="free")
