import json
from tools.base import Tool, safe_path
from models.schemas import ToolResultSchema


class JsonTransformTool(Tool):
    @property
    def name(self) -> str:
        return "json_transform"

    @property
    def description(self) -> str:
        return "Transform JSON data: extract fields, filter arrays, flatten nested structures, merge files, or convert to CSV."

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "operation": {
                    "type": "string",
                    "enum": ["extract", "filter", "flatten", "merge", "to_csv"],
                    "description": "Transform operation to perform",
                },
                "input_file": {
                    "type": "string",
                    "description": "Path to input JSON file (relative to workspace)",
                },
                "output_file": {
                    "type": "string",
                    "description": "Path to save output (relative to workspace)",
                },
                "expression": {
                    "type": "string",
                    "description": "Dot-path for extract (e.g. 'data.users'), key=value for filter (e.g. 'status=active')",
                },
                "merge_file": {
                    "type": "string",
                    "description": "Second file for merge operation",
                },
            },
            "required": ["operation", "input_file"],
        }

    async def execute(self, params: dict, workspace_path: str) -> ToolResultSchema:
        operation = params.get("operation")
        input_path = safe_path(workspace_path, params["input_file"])

        if not input_path.exists():
            return ToolResultSchema(success=False, output="", error=f"File not found: {params['input_file']}")

        try:
            data = json.loads(input_path.read_text())
        except json.JSONDecodeError as e:
            return ToolResultSchema(success=False, output="", error=f"Invalid JSON: {e}")

        try:
            if operation == "extract":
                result = self._extract(data, params.get("expression", ""))
            elif operation == "filter":
                result = self._filter(data, params.get("expression", ""))
            elif operation == "flatten":
                result = self._flatten(data)
            elif operation == "merge":
                merge_path = safe_path(workspace_path, params.get("merge_file", ""))
                merge_data = json.loads(merge_path.read_text())
                result = self._merge(data, merge_data)
            elif operation == "to_csv":
                return self._to_csv(data, params.get("output_file"), workspace_path)
            else:
                return ToolResultSchema(success=False, output="", error=f"Unknown operation: {operation}")

            output = json.dumps(result, indent=2, default=str)

            if params.get("output_file"):
                out_path = safe_path(workspace_path, params["output_file"])
                out_path.parent.mkdir(parents=True, exist_ok=True)
                out_path.write_text(output)
                return ToolResultSchema(success=True, output=f"Saved to {params['output_file']} ({len(output)} bytes)")

            return ToolResultSchema(success=True, output=output[:5000])
        except Exception as e:
            return ToolResultSchema(success=False, output="", error=str(e))

    def _extract(self, data, path: str):
        for key in path.split("."):
            if isinstance(data, dict):
                data = data[key]
            elif isinstance(data, list) and key.isdigit():
                data = data[int(key)]
            else:
                raise KeyError(f"Cannot traverse into {type(data).__name__} with key '{key}'")
        return data

    def _filter(self, data, expression: str):
        if not isinstance(data, list):
            raise ValueError("Filter requires a JSON array")
        key, _, value = expression.partition("=")
        return [item for item in data if str(item.get(key)) == value]

    def _flatten(self, data, prefix=""):
        items = {}
        if isinstance(data, dict):
            for k, v in data.items():
                new_key = f"{prefix}.{k}" if prefix else k
                if isinstance(v, (dict, list)):
                    items.update(self._flatten(v, new_key))
                else:
                    items[new_key] = v
        elif isinstance(data, list):
            for i, v in enumerate(data):
                new_key = f"{prefix}.{i}"
                if isinstance(v, (dict, list)):
                    items.update(self._flatten(v, new_key))
                else:
                    items[new_key] = v
        else:
            items[prefix] = data
        return items

    def _merge(self, a, b):
        if isinstance(a, dict) and isinstance(b, dict):
            merged = {**a}
            for k, v in b.items():
                if k in merged and isinstance(merged[k], dict) and isinstance(v, dict):
                    merged[k] = self._merge(merged[k], v)
                else:
                    merged[k] = v
            return merged
        if isinstance(a, list) and isinstance(b, list):
            return a + b
        return b

    def _to_csv(self, data, output_file, workspace_path):
        if not isinstance(data, list) or not data:
            return ToolResultSchema(success=False, output="", error="to_csv requires a non-empty JSON array of objects")
        headers = list(data[0].keys())
        lines = [",".join(headers)]
        for row in data:
            lines.append(",".join(str(row.get(h, "")) for h in headers))
        csv_text = "\n".join(lines)

        if output_file:
            out_path = safe_path(workspace_path, output_file)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(csv_text)
            return ToolResultSchema(success=True, output=f"CSV saved to {output_file} ({len(data)} rows)")
        return ToolResultSchema(success=True, output=csv_text[:5000])
