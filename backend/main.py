from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config import settings
from database import init_db
from routers import tasks, agents, workspace


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.workspaces_dir.mkdir(parents=True, exist_ok=True)
    await init_db()
    yield


app = FastAPI(title="AutoPilot", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks.router, prefix="/api")
app.include_router(agents.router, prefix="/api")
app.include_router(workspace.router, prefix="/api")
