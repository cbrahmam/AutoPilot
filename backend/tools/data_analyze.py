import asyncio
import json
from pathlib import Path
from tools.base import Tool, safe_path
from models.schemas import ToolResultSchema
from config import settings


class DataAnalyzeTool(Tool):
    @property
    def name(self) -> str:
        return "data_analyze"

    @property
    def description(self) -> str:
        return (
            "Analyze CSV or JSON data files. Operations: describe (statistics), "
            "columns (list columns with types), filter (filter rows by condition), "
            "sort (sort by column). Data files must be in the workspace."
        )

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "operation": {
                    "type": "string",
                    "enum": ["describe", "columns", "filter", "sort", "head"],
                    "description": "Analysis operation to perform",
                },
                "file": {
                    "type": "string",
                    "description": "CSV or JSON file path relative to workspace",
                },
                "column": {
                    "type": "string",
                    "description": "Column name for filter/sort operations",
                },
                "condition": {
                    "type": "string",
                    "enum": ["gt", "lt", "eq", "ne", "contains"],
                    "description": "Condition for filter operation",
                },
                "value": {
                    "type": "string",
                    "description": "Value to compare for filter operation",
                },
                "ascending": {
                    "type": "boolean",
                    "description": "Sort order (default: true)",
                    "default": True,
                },
                "rows": {
                    "type": "integer",
                    "description": "Number of rows for head operation (default: 10)",
                    "default": 10,
                },
            },
            "required": ["operation", "file"],
        }

    async def execute(self, params: dict, workspace_path: str) -> ToolResultSchema:
        operation = params["operation"]
        file_path = safe_path(workspace_path, params["file"])

        if not file_path.exists():
            return ToolResultSchema(success=False, output="", error=f"File not found: {params['file']}")

        try:
            df = await asyncio.to_thread(self._load_data, file_path)
        except Exception as e:
            return ToolResultSchema(success=False, output="", error=f"Failed to load data: {e}")

        try:
            if operation == "describe":
                return await asyncio.to_thread(self._describe, df)
            elif operation == "columns":
                return await asyncio.to_thread(self._columns, df)
            elif operation == "filter":
                column = params.get("column")
                condition = params.get("condition")
                value = params.get("value")
                if not all([column, condition, value]):
                    return ToolResultSchema(success=False, output="", error="Filter requires column, condition, and value")
                return await asyncio.to_thread(self._filter, df, column, condition, value)
            elif operation == "sort":
                column = params.get("column")
                if not column:
                    return ToolResultSchema(success=False, output="", error="Sort requires column")
                ascending = params.get("ascending", True)
                return await asyncio.to_thread(self._sort, df, column, ascending)
            elif operation == "head":
                rows = params.get("rows", 10)
                return await asyncio.to_thread(self._head, df, rows)
            else:
                return ToolResultSchema(success=False, output="", error=f"Unknown operation: {operation}")
        except Exception as e:
            return ToolResultSchema(success=False, output="", error=f"Analysis error: {e}")

    def _load_data(self, file_path: Path):
        import pandas as pd
        suffix = file_path.suffix.lower()
        if suffix == ".csv":
            return pd.read_csv(file_path)
        elif suffix == ".json":
            return pd.read_json(file_path)
        else:
            raise ValueError(f"Unsupported file type: {suffix}. Use CSV or JSON.")

    def _describe(self, df) -> ToolResultSchema:
        info = f"Shape: {df.shape[0]} rows x {df.shape[1]} columns\nColumns: {list(df.columns)}\n\n"
        desc = df.describe(include="all").to_string()
        output = self._truncate(info + desc)
        return ToolResultSchema(success=True, output=output)

    def _columns(self, df) -> ToolResultSchema:
        cols = []
        for c in df.columns:
            cols.append({
                "name": c,
                "dtype": str(df[c].dtype),
                "nulls": int(df[c].isna().sum()),
                "unique": int(df[c].nunique()),
            })
        output = json.dumps(cols, indent=2)
        return ToolResultSchema(success=True, output=output, data=cols)

    def _filter(self, df, column: str, condition: str, value: str) -> ToolResultSchema:
        if column not in df.columns:
            return ToolResultSchema(success=False, output="", error=f"Column not found: {column}")

        try:
            numeric_val = float(value)
            use_numeric = True
        except ValueError:
            numeric_val = None
            use_numeric = False

        if condition == "eq":
            mask = df[column].astype(str) == value
        elif condition == "ne":
            mask = df[column].astype(str) != value
        elif condition == "gt" and use_numeric:
            mask = df[column] > numeric_val
        elif condition == "lt" and use_numeric:
            mask = df[column] < numeric_val
        elif condition == "contains":
            mask = df[column].astype(str).str.contains(value, case=False, na=False)
        else:
            return ToolResultSchema(success=False, output="", error=f"Invalid condition '{condition}' for value '{value}'")

        filtered = df[mask]
        output = f"Found {len(filtered)} matching rows:\n\n{filtered.head(20).to_string()}"
        return ToolResultSchema(success=True, output=self._truncate(output))

    def _sort(self, df, column: str, ascending: bool) -> ToolResultSchema:
        if column not in df.columns:
            return ToolResultSchema(success=False, output="", error=f"Column not found: {column}")
        sorted_df = df.sort_values(column, ascending=ascending)
        output = sorted_df.head(20).to_string()
        return ToolResultSchema(success=True, output=self._truncate(output))

    def _head(self, df, rows: int) -> ToolResultSchema:
        output = df.head(rows).to_string()
        return ToolResultSchema(success=True, output=self._truncate(output))

    def _truncate(self, text: str) -> str:
        limit = settings.max_tool_output_chars
        if len(text) <= limit:
            return text
        return text[:limit] + "\n\n[Content truncated...]"
