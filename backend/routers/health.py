from fastapi import APIRouter, Query

from core.health import run_all_checks, get_health_history, get_uptime_stats, get_system_info, get_database_stats

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
async def health_check():
    return await run_all_checks()


@router.get("/history")
async def history(service: str | None = Query(None), limit: int = Query(50, ge=1, le=500)):
    return await get_health_history(service or "", limit)


@router.get("/uptime")
async def uptime():
    return await get_uptime_stats()


@router.get("/system")
async def system_info():
    return await get_system_info()


@router.get("/database")
async def database_info():
    return await get_database_stats()
