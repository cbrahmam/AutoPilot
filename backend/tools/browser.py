import asyncio
import json
from tools.base import Tool
from models.schemas import ToolResultSchema

try:
    from playwright.async_api import async_playwright
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False


class BrowserTool(Tool):
    _browser = None
    _context = None

    @property
    def name(self) -> str:
        return "browser"

    @property
    def description(self) -> str:
        return (
            "Full browser automation for JavaScript-rendered pages. "
            "Can navigate, click, fill forms, extract text, take screenshots, and run JS. "
            "Falls back to simple HTTP fetch if Playwright is not installed."
        )

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": [
                        "navigate", "screenshot", "extract_text", "click",
                        "fill", "get_links", "wait", "evaluate",
                    ],
                    "description": "The browser action to perform.",
                },
                "url": {"type": "string", "description": "URL to navigate to (for 'navigate' action)."},
                "selector": {"type": "string", "description": "CSS selector (for click/fill/extract_text/wait)."},
                "text": {"type": "string", "description": "Text to fill (for 'fill' action)."},
                "js_code": {"type": "string", "description": "JavaScript to evaluate (for 'evaluate' action)."},
            },
            "required": ["action"],
        }

    async def execute(self, params: dict, workspace_path: str) -> ToolResultSchema:
        action = params.get("action")

        if not HAS_PLAYWRIGHT:
            return await self._fallback_execute(params, workspace_path)

        if action == "navigate":
            return await self._navigate(params, workspace_path)
        elif action == "screenshot":
            return await self._screenshot(params, workspace_path)
        elif action == "extract_text":
            return await self._extract_text(params)
        elif action == "click":
            return await self._click(params)
        elif action == "fill":
            return await self._fill(params)
        elif action == "get_links":
            return await self._get_links(params)
        elif action == "wait":
            return await self._wait(params)
        elif action == "evaluate":
            return await self._evaluate(params)
        else:
            return ToolResultSchema(success=False, output="", error=f"Unknown action: {action}")

    async def _get_page(self):
        if not BrowserTool._browser:
            pw = await async_playwright().start()
            BrowserTool._browser = await pw.chromium.launch(headless=True)
            BrowserTool._context = await BrowserTool._browser.new_context(
                viewport={"width": 1280, "height": 720},
                user_agent="Mozilla/5.0 (AutoPilot Browser Agent)",
            )
        pages = BrowserTool._context.pages
        if pages:
            return pages[-1]
        return await BrowserTool._context.new_page()

    async def _navigate(self, params, workspace_path):
        url = params.get("url", "")
        if not url:
            return ToolResultSchema(success=False, output="", error="URL is required for navigate")
        page = await self._get_page()
        try:
            response = await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            title = await page.title()
            status = response.status if response else "unknown"
            return ToolResultSchema(
                success=True,
                output=f"Navigated to {url}\nTitle: {title}\nStatus: {status}",
            )
        except Exception as e:
            return ToolResultSchema(success=False, output="", error=str(e))

    async def _screenshot(self, params, workspace_path):
        page = await self._get_page()
        import os
        path = os.path.join(workspace_path, "screenshot.png")
        await page.screenshot(path=path, full_page=False)
        return ToolResultSchema(
            success=True,
            output=f"Screenshot saved to screenshot.png ({os.path.getsize(path)} bytes)",
        )

    async def _extract_text(self, params):
        page = await self._get_page()
        selector = params.get("selector")
        try:
            if selector:
                element = await page.query_selector(selector)
                if not element:
                    return ToolResultSchema(success=False, output="", error=f"No element found: {selector}")
                text = await element.inner_text()
            else:
                text = await page.inner_text("body")
            text = text[:5000]
            return ToolResultSchema(success=True, output=text)
        except Exception as e:
            return ToolResultSchema(success=False, output="", error=str(e))

    async def _click(self, params):
        selector = params.get("selector", "")
        if not selector:
            return ToolResultSchema(success=False, output="", error="Selector is required for click")
        page = await self._get_page()
        try:
            await page.click(selector, timeout=10000)
            return ToolResultSchema(success=True, output=f"Clicked: {selector}")
        except Exception as e:
            return ToolResultSchema(success=False, output="", error=str(e))

    async def _fill(self, params):
        selector = params.get("selector", "")
        text = params.get("text", "")
        if not selector:
            return ToolResultSchema(success=False, output="", error="Selector is required for fill")
        page = await self._get_page()
        try:
            await page.fill(selector, text, timeout=10000)
            return ToolResultSchema(success=True, output=f"Filled '{selector}' with text")
        except Exception as e:
            return ToolResultSchema(success=False, output="", error=str(e))

    async def _get_links(self, params):
        page = await self._get_page()
        try:
            links = await page.eval_on_selector_all(
                "a[href]",
                "els => els.map(e => ({text: e.innerText.trim().slice(0, 80), href: e.href})).slice(0, 50)"
            )
            formatted = "\n".join(f"- [{l['text']}]({l['href']})" for l in links if l["href"])
            return ToolResultSchema(success=True, output=formatted or "No links found")
        except Exception as e:
            return ToolResultSchema(success=False, output="", error=str(e))

    async def _wait(self, params):
        selector = params.get("selector", "")
        if not selector:
            return ToolResultSchema(success=False, output="", error="Selector is required for wait")
        page = await self._get_page()
        try:
            await page.wait_for_selector(selector, timeout=15000)
            return ToolResultSchema(success=True, output=f"Element found: {selector}")
        except Exception as e:
            return ToolResultSchema(success=False, output="", error=str(e))

    async def _evaluate(self, params):
        js_code = params.get("js_code", "")
        if not js_code:
            return ToolResultSchema(success=False, output="", error="js_code is required for evaluate")
        page = await self._get_page()
        try:
            result = await page.evaluate(js_code)
            output = json.dumps(result, indent=2, default=str) if result is not None else "undefined"
            return ToolResultSchema(success=True, output=output[:5000])
        except Exception as e:
            return ToolResultSchema(success=False, output="", error=str(e))

    async def _fallback_execute(self, params, workspace_path):
        """Fallback using httpx + BeautifulSoup when Playwright isn't installed."""
        action = params.get("action")
        if action not in ("navigate", "extract_text", "get_links"):
            return ToolResultSchema(
                success=False, output="",
                error=f"Action '{action}' requires Playwright (not installed). Only navigate/extract_text/get_links available in fallback mode.",
            )

        import httpx
        from bs4 import BeautifulSoup

        url = params.get("url", "")
        if action == "navigate" and not url:
            return ToolResultSchema(success=False, output="", error="URL is required")

        if not hasattr(BrowserTool, '_fallback_html'):
            BrowserTool._fallback_html = None
            BrowserTool._fallback_url = None

        if action == "navigate":
            try:
                async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
                    resp = await client.get(url)
                soup = BeautifulSoup(resp.text, "html.parser")
                BrowserTool._fallback_html = soup
                BrowserTool._fallback_url = url
                title = soup.title.string if soup.title else "No title"
                return ToolResultSchema(
                    success=True,
                    output=f"Navigated to {url} (fallback mode)\nTitle: {title}\nStatus: {resp.status_code}",
                )
            except Exception as e:
                return ToolResultSchema(success=False, output="", error=str(e))

        soup = BrowserTool._fallback_html
        if not soup:
            return ToolResultSchema(success=False, output="", error="No page loaded. Use navigate first.")

        if action == "extract_text":
            for tag in soup(["script", "style", "nav", "footer", "header"]):
                tag.decompose()
            text = soup.get_text(separator="\n", strip=True)[:5000]
            return ToolResultSchema(success=True, output=text)

        if action == "get_links":
            links = []
            for a in soup.find_all("a", href=True)[:50]:
                text = a.get_text(strip=True)[:80]
                href = a["href"]
                links.append(f"- [{text}]({href})")
            return ToolResultSchema(success=True, output="\n".join(links) or "No links found")

    @classmethod
    async def cleanup(cls):
        if cls._browser:
            await cls._browser.close()
            cls._browser = None
            cls._context = None
