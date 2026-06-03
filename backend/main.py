from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config import settings
from database import init_db
from routers import tasks, agents, workspace, templates, stats, plugins, schedules, chat, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.workspaces_dir.mkdir(parents=True, exist_ok=True)
    await init_db()
    from plugins import discover_plugins
    discover_plugins()
    from core.scheduler import scheduler
    await scheduler.start()
    yield
    await scheduler.stop()
    try:
        from tools.browser import BrowserTool
        await BrowserTool.cleanup()
    except Exception:
        pass


app = FastAPI(title="AutoPilot", version="0.2.0", lifespan=lifespan)

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
app.include_router(templates.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(plugins.router, prefix="/api")
app.include_router(schedules.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
