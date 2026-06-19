from tools.base import Tool
from models.schemas import ToolResultSchema


class KnowledgeSearchTool(Tool):
    @property
    def name(self) -> str:
        return "knowledge_search"

    @property
    def description(self) -> str:
        return "Search the knowledge base for relevant documents and information. Returns the most relevant text chunks matching the query."

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query to find relevant knowledge",
                },
                "top_k": {
                    "type": "integer",
                    "description": "Number of results to return (default 5)",
                    "default": 5,
                },
            },
            "required": ["query"],
        }

    async def execute(self, params: dict, workspace_path: str = "") -> ToolResultSchema:
        query = params.get("query", "")
        top_k = params.get("top_k", 5)

        if not query:
            return ToolResultSchema(success=False, output="", error="Query is required")

        from core.knowledge_base import search_knowledge
        results = await search_knowledge(query, top_k)

        if not results:
            return ToolResultSchema(
                success=True,
                output="No relevant documents found in the knowledge base.",
                data={"results": []},
            )

        output_parts = [f"Found {len(results)} relevant chunks:\n"]
        for i, r in enumerate(results, 1):
            output_parts.append(
                f"--- Result {i} (score: {r['score']}, source: {r['filename']}) ---\n"
                f"{r['content'][:1000]}\n"
            )

        return ToolResultSchema(
            success=True,
            output="\n".join(output_parts),
            data={"results": [{"filename": r["filename"], "score": r["score"], "content": r["content"][:500]} for r in results]},
        )
