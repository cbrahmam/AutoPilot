import importlib
import importlib.util
import sys
from pathlib import Path
from tools.base import Tool

_loaded_plugins: dict[str, Tool] = {}


def discover_plugins(plugins_dir: Path | None = None) -> dict[str, Tool]:
    if plugins_dir is None:
        plugins_dir = Path(__file__).parent

    _loaded_plugins.clear()

    for file in sorted(plugins_dir.glob("*.py")):
        if file.name.startswith("_"):
            continue
        module_name = f"plugins.{file.stem}"
        try:
            if module_name in sys.modules:
                del sys.modules[module_name]
            spec = importlib.util.spec_from_file_location(module_name, file)
            if spec is None or spec.loader is None:
                continue
            module = importlib.util.module_from_spec(spec)
            sys.modules[module_name] = module
            spec.loader.exec_module(module)

            for attr_name in dir(module):
                obj = getattr(module, attr_name)
                if (
                    isinstance(obj, type)
                    and issubclass(obj, Tool)
                    and obj is not Tool
                    and not getattr(obj, "__abstractmethods__", None)
                ):
                    instance = obj()
                    _loaded_plugins[instance.name] = instance
        except Exception:
            continue

    return _loaded_plugins


def get_loaded_plugins() -> dict[str, Tool]:
    return dict(_loaded_plugins)


def reload_plugins() -> dict[str, Tool]:
    return discover_plugins()
