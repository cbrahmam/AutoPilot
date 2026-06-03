import math
from tools.base import Tool
from models.schemas import ToolResultSchema


class CalculatorTool(Tool):
    @property
    def name(self) -> str:
        return "calculator"

    @property
    def description(self) -> str:
        return "Evaluate mathematical expressions safely. Supports basic arithmetic, trig, logarithms, and common math functions."

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "Mathematical expression to evaluate (e.g. '2**10', 'math.sqrt(144)', 'math.log(100, 10)')",
                },
            },
            "required": ["expression"],
        }

    async def execute(self, params: dict, workspace_path: str) -> ToolResultSchema:
        expression = params.get("expression", "")
        if not expression:
            return ToolResultSchema(success=False, output="", error="No expression provided")

        allowed_names = {
            k: getattr(math, k)
            for k in dir(math)
            if not k.startswith("_")
        }
        allowed_names.update({
            "abs": abs, "round": round, "min": min, "max": max,
            "sum": sum, "pow": pow, "int": int, "float": float,
        })

        for blocked in ("import", "__", "exec", "eval", "open", "os.", "sys.", "subprocess"):
            if blocked in expression:
                return ToolResultSchema(success=False, output="", error=f"Blocked keyword: {blocked}")

        try:
            result = eval(expression, {"__builtins__": {}}, allowed_names)
            return ToolResultSchema(success=True, output=str(result))
        except Exception as e:
            return ToolResultSchema(success=False, output="", error=f"Evaluation error: {e}")
