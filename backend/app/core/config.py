import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base backend directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load .env file with override=True (check backend/.env, then fallback to .env)
env_file_path = BASE_DIR / ".env"
if not env_file_path.exists():
    env_file_path = Path(".env")
load_dotenv(dotenv_path=env_file_path, override=True)

DEFAULT_DB_FILE = BASE_DIR / "app.db"
DEFAULT_CHROMA_DIR = BASE_DIR / "chroma_db"

class Settings(BaseSettings):
    PROJECT_NAME: str = "Universal Website AI Agent Platform MVP"
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_FILE.as_posix()}")
    CHROMA_PERSIST_DIR: str = os.getenv("CHROMA_PERSIST_DIR", str(DEFAULT_CHROMA_DIR))

    # Allowed CORS Origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]

    # API Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    DEFAULT_LLM_PROVIDER: str = os.getenv(
        "DEFAULT_LLM_PROVIDER",
        "openai" if os.getenv("OPENAI_API_KEY") else "mock"
    )

    CRAWL_MAX_PAGES: int = 50
    CRAWL_CONCURRENCY: int = 5
    CRAWL_TIMEOUT: int = 15

    CHUNK_SIZE: int = 800
    CHUNK_OVERLAP: int = 150

    HARD_CODED_BOT_TTL_DAYS: int = int(os.getenv("HARD_CODED_BOT_TTL_DAYS", "7"))
    VERIFY_SSL: bool = os.getenv("VERIFY_SSL", "true").lower() in ("true", "1", "yes")

    model_config = SettingsConfigDict(
        env_file=str(env_file_path),
        extra="ignore"
    )

settings = Settings()
