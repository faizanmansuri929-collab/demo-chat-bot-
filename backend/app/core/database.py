from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def init_db():
    Base.metadata.create_all(bind=engine)
    try:
        with engine.connect() as conn:
            from sqlalchemy import text
            try:
                conn.execute(text("ALTER TABLE products ADD COLUMN description TEXT;"))
                conn.commit()
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE college_web_search_caches ADD COLUMN spoken_summary TEXT;"))
                conn.commit()
            except Exception:
                pass
    except Exception:
        pass

init_db()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
