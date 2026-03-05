from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str = ""
    trello_api_key: str = ""
    trello_api_token: str = ""
    trello_board_id: str = ""
    trello_list_id: str = ""
    webhook_url: str = ""
    whisper_model: str = "whisper-1"
    llm_model: str = "gpt-4o-mini"
    allowed_origins: List[str] = ["*"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
