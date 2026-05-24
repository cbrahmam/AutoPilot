import httpx
from bs4 import BeautifulSoup
from tools.base import Tool
from models.schemas import ToolResultSchema
from config import settings


class WebBrowseTool(Tool):
    @property
    def name(self) -> str:
        return "web_browse"

    @property
    def description(self) -> str:
        return (
            "Fetch a web page and extract its content. Can extract clean text, "
            "raw HTML, all links, or tables from the page."
        )

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "URL to fetch",
                },
                "extract": {
                    "type": "string",
                    "enum": ["text", "html", "links", "tables"],
                    "description": "What to extract from the page (default: text)",
                    "default": "text",
                },
            },
            "required": ["url"],
        }

    async def execute(self, params: dict, workspace_path: str) -> ToolResultSchema:
        url = params["url"]
        extract = params.get("extract", "text")

        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
        except httpx.HTTPStatusError as e:
            return ToolResultSchema(success=False, output="", error=f"HTTP {e.response.status_code}: {url}")
        except httpx.RequestError as e:
            return ToolResultSchema(success=False, output="", error=f"Request failed: {e}")

        soup = BeautifulSoup(response.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()

        if extract == "text":
            text = soup.get_text(separator="\n", strip=True)
            text = "\n".join(line for line in text.splitlines() if line.strip())
            output = self._truncate(text)
        elif extract == "html":
            output = self._truncate(str(soup))
        elif extract == "links":
            links = []
            for a in soup.find_all("a", href=True):
                href = a["href"]
                label = a.get_text(strip=True)[:80]
                links.append(f"{label} -> {href}")
            output = "\n".join(links) if links else "No links found."
            output = self._truncate(output)
        elif extract == "tables":
            tables = soup.find_all("table")
            if not tables:
                output = "No tables found on page."
            else:
                parts = []
                for i, table in enumerate(tables[:5]):
                    rows = table.find_all("tr")
                    table_data = []
                    for row in rows[:50]:
                        cells = [c.get_text(strip=True) for c in row.find_all(["th", "td"])]
                        table_data.append(" | ".join(cells))
                    parts.append(f"Table {i + 1}:\n" + "\n".join(table_data))
                output = self._truncate("\n\n".join(parts))
        else:
            output = ""

        return ToolResultSchema(success=True, output=output)

    def _truncate(self, text: str) -> str:
        limit = settings.max_tool_output_chars
        if len(text) <= limit:
            return text
        return text[:limit] + "\n\n[Content truncated...]"
