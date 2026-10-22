import os
from dotenv import load_dotenv

# Load .env file with override=True to ensure .env takes precedence over any old session variables
load_dotenv(override=True)

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Universal Website AI Agent Platform MVP"
    DATABASE_URL: str = "sqlite:///./app.db"
    CHROMA_PERSIST_DIR: str = "./chroma_db"
    
    # API Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    DEFAULT_LLM_PROVIDER: str = os.getenv("DEFAULT_LLM_PROVIDER", "openai" if os.getenv("OPENAI_API_KEY") else "mock")
    
    CRAWL_MAX_PAGES: int = 50
    CRAWL_CONCURRENCY: int = 5
    CRAWL_TIMEOUT: int = 15
    
    CHUNK_SIZE: int = 800
    CHUNK_OVERLAP: int = 150
    
    HARD_CODED_BOT_TTL_DAYS: int = int(os.getenv("HARD_CODED_BOT_TTL_DAYS", "7"))
    VERIFY_SSL: bool = os.getenv("VERIFY_SSL", "true").lower() in ("true", "1", "yes")
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
