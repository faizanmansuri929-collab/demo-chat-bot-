import os
from pathlib import Path
from app.core.config import settings, BASE_DIR
from app.core.database import engine, init_db, SessionLocal
from app.models.schemas import AgentDB, CollegeWebSearchProjectDB, ProductDB, HardcodedBotDB

def test_config_paths():
    assert BASE_DIR.is_dir(), "BASE_DIR must point to a valid directory"
    assert "app.db" in settings.DATABASE_URL, "DATABASE_URL must target app.db"
    assert "chroma_db" in settings.CHROMA_PERSIST_DIR, "CHROMA_PERSIST_DIR must target chroma_db"

def test_database_connection_and_tables():
    init_db()
    db = SessionLocal()
    try:
        # Check that primary tables are queryable
        agent_count = db.query(AgentDB).count()
        assert agent_count >= 0

        project_count = db.query(CollegeWebSearchProjectDB).count()
        assert project_count >= 0

        product_count = db.query(ProductDB).count()
        assert product_count >= 0

        bot_count = db.query(HardcodedBotDB).count()
        assert bot_count >= 0
    finally:
        db.close()

