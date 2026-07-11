from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import engine, Base, SessionLocal
from .routers import cases, agents, timeline, graph, search, audit, analytics, osint, auth
from . import models

# Create SQLite tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set CORS origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(cases.router, prefix=settings.API_V1_STR)
app.include_router(agents.router, prefix=settings.API_V1_STR)
app.include_router(timeline.router, prefix=settings.API_V1_STR)
app.include_router(graph.router, prefix=settings.API_V1_STR)
app.include_router(search.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(osint.router, prefix=settings.API_V1_STR)
app.include_router(auth.router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        # Seed case
        case_count = db.query(models.Case).count()
        if case_count == 0:
            default_case = models.Case(
                name="Operation Safe Haven",
                description="Simulated investigation tracking digital forensics leads on target grooming rings and child safety threats."
            )
            db.add(default_case)
            db.commit()
            db.refresh(default_case)
            
            audit = models.AuditLog(
                case_id=default_case.id,
                user="System",
                action="CREATE_CASE",
                details="Seeded default investigation case 'Operation Safe Haven' on platform initialization."
            )
            db.add(audit)
            db.commit()
            
        # Seed investigator user
        user_count = db.query(models.User).count()
        if user_count == 0:
            from .routers.auth import get_password_hash
            default_user = models.User(
                username="investigator",
                hashed_password=get_password_hash("investigatorpassword"),
                role="investigator"
            )
            db.add(default_user)
            db.commit()
    finally:
        db.close()

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "ACPIA Digital Evidence Intelligence Platform",
        "version": "1.0.0"
    }
