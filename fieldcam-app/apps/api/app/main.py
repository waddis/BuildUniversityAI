from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import (
    auth,
    comments,
    companies,
    media,
    notes,
    notifications,
    projects,
    reports,
    search,
    share_links,
    tasks,
    users,
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup
    yield
    # Shutdown
    from app.database import engine

    await engine.dispose()


app = FastAPI(
    title="fieldcam.app API",
    description="Field documentation platform API",
    version="0.1.0",
    lifespan=lifespan,
)

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(companies.router, prefix="/api/v1/companies", tags=["companies"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["projects"])
app.include_router(media.router, prefix="/api/v1/media", tags=["media"])
app.include_router(notes.router, prefix="/api/v1/notes", tags=["notes"])
app.include_router(comments.router, prefix="/api/v1/comments", tags=["comments"])
app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["tasks"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])
app.include_router(share_links.router, prefix="/api/v1/share-links", tags=["share-links"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["notifications"])
app.include_router(search.router, prefix="/api/v1/search", tags=["search"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "fieldcam-api"}
