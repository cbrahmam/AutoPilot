import asyncio
from tools.base import Tool
from models.schemas import ToolResultSchema


class WebSearchTool(Tool):
    @property
    def name(self) -> str:
        return "web_search"

    @property
    def description(self) -> str:
        return (
            "Search the web using DuckDuckGo. Returns a list of results with titles, "
            "URLs, and snippets. Use this to find information, articles, documentation, etc."
        )

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query",
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of results to return (default 10)",
                    "default": 10,
                },
            },
            "required": ["query"],
        }

    async def execute(self, params: dict, workspace_path: str) -> ToolResultSchema:
        query = params["query"]
        max_results = params.get("max_results", 10)

        try:
            results = await asyncio.to_thread(self._search, query, max_results)
        except Exception as e:
            return ToolResultSchema(
                success=False,
                output="",
                error=f"Search failed: {e}",
            )

        if not results:
            return ToolResultSchema(success=True, output="No results found.", data=[])

        output = self._format_results(results)
        return ToolResultSchema(success=True, output=output, data=results)

    def _search(self, query: str, max_results: int) -> list[dict]:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            return list(ddgs.text(query, max_results=max_results))

    def _format_results(self, results: list[dict]) -> str:
        lines = []
        for i, r in enumerate(results, 1):
            title = r.get("title", "No title")
            url = r.get("href", r.get("link", ""))
            snippet = r.get("body", r.get("snippet", ""))
            lines.append(f"{i}. {title}\n   URL: {url}\n   {snippet}\n")
        return "\n".join(lines)
