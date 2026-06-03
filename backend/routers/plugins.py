from fastapi import APIRouter
from plugins import get_loaded_plugins, reload_plugins

router = APIRouter()


@router.get("/plugins")
async def list_plugins():
    plugins = get_loaded_plugins()
    return [
        {
            "name": tool.name,
            "description": tool.description,
            "input_schema": tool.input_schema,
        }
        for tool in plugins.values()
    ]


@router.post("/plugins/reload")
async def reload_all_plugins():
    plugins = reload_plugins()
    return {
        "reloaded": len(plugins),
        "plugins": list(plugins.keys()),
    }
