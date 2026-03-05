"""Chargement des prompts système au démarrage."""
from pathlib import Path

# Chemin vers les prompts (relatif à la racine backend)
PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"
PM_KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent / "pm-knowledge-base"

# Variable globale chargée au démarrage
SYSTEM_PROMPT_PM: str = ""


def _load_file(path: Path) -> str:
    if path.exists():
        return path.read_text(encoding="utf-8")
    return ""


def load_system_prompt_pm() -> str:
    """Charge le system prompt PM Expert depuis le fichier .md."""
    global SYSTEM_PROMPT_PM
    path = PROMPTS_DIR / "system_prompt_pm.md"
    content = _load_file(path)
    if content:
        SYSTEM_PROMPT_PM = content
    else:
        # Fallback si fichier absent (dev)
        SYSTEM_PROMPT_PM = (
            "Tu es un Chef de Projet / Product Owner senior. "
            "Analyse les idées de projet. Donne un verdict go/pivot/drop. "
            "Réponds en français."
        )
    return SYSTEM_PROMPT_PM


def get_system_prompt_pm() -> str:
    """Retourne le system prompt PM (charge si pas encore fait)."""
    if not SYSTEM_PROMPT_PM:
        load_system_prompt_pm()
    return SYSTEM_PROMPT_PM


def load_pm_knowledge() -> str:
    """Charge les fichiers de la base de connaissances PM (pour RAG futur)."""
    if not PM_KNOWLEDGE_DIR.exists():
        return ""
    parts = []
    for md_file in sorted(PM_KNOWLEDGE_DIR.glob("*.md")):
        parts.append(f"## {md_file.stem}\n\n{_load_file(md_file)}")
    return "\n\n---\n\n".join(parts) if parts else ""
