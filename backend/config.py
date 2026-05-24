from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    model_name: str = "claude-sonnet-4-20250514"

    max_iterations_per_agent: int = 25
    max_code_execution_time: int = 30
    max_code_memory_mb: int = 256
    max_tool_output_chars: int = 5000
    max_conversation_messages: int = 50
    human_approval_timeout: int = 300

    sandbox_mode: str = "subprocess"

    base_dir: Path = Path(__file__).parent
    workspaces_dir: Path = Path(__file__).parent / "workspaces"
    database_path: Path = Path(__file__).parent / "autopilot.db"

    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
