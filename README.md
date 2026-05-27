# AutoPilot

**Autonomous AI agents that plan, research, code, analyze, and deliver.**

AutoPilot is an AI agent orchestration framework that decomposes complex goals into specialist sub-tasks, assigns purpose-built agents, and synthesizes results — all with real-time visibility into every step.

---

## The Problem

Complex tasks — market research, data analysis, code generation — require multiple steps across different domains. Manually orchestrating LLM calls, tool use, and information flow is tedious and error-prone.

## The Solution

Describe your goal in natural language. AutoPilot:

1. **Plans** — decomposes your goal into a dependency graph of sub-tasks using Claude
2. **Assigns** — routes each sub-task to a specialist agent (Researcher, Coder, Analyst, Writer)
3. **Executes** — runs agents in parallel where possible, with full tool access
4. **Synthesizes** — merges outputs into a cohesive final result

---

## Features

- **Multi-Agent Orchestration** — Planner decomposes goals, Executor runs specialist agents in parallel layers
- **5 Specialist Agents** — Researcher, Coder, Analyst, Writer, and General-purpose
- **9 Built-in Tools** — Web search, web browse, browser automation, code execution, file operations, data analysis, shell commands, human-in-the-loop, memory
- **Browser Automation** — Playwright-powered (headless Chrome) for JS-rendered pages, with httpx fallback
- **Real-time Streaming** — WebSocket-based event stream showing every thought, tool call, and result
- **Human-in-the-Loop** — Optional approval gates for tool calls; agents can ask questions and wait for responses
- **Workspace Management** — Each task gets an isolated workspace; browse files, preview code/CSV/markdown, download as zip
- **Task Templates** — 5 pre-built workflows (Competitive Research, Data Pipeline, CSV Analysis, Blog Post, Market Research)
- **Cost Tracking** — Per-task and cumulative token usage with estimated cost breakdown
- **Memory System** — Agents save and recall facts, decisions, and observations across iterations
- **Sandboxed Execution** — Code runs in isolated subprocesses with timeouts, memory limits, and minimal environment variables

---

## Architecture

```
Goal
 |
 v
┌─────────┐     ┌───────────┐     ┌──────────────────────┐
│ Planner │────>│ Task Plan │────>│     Executor         │
└─────────┘     └───────────┘     │                      │
                                  │  Layer 1: [Agent A]  │
                                  │           [Agent B]  │  (parallel)
                                  │  Layer 2: [Agent C]  │  (depends on A+B)
                                  └──────────────────────┘
                                           |
                                           v
                                    ┌─────────────┐
                                    │ Synthesizer │
                                    └─────────────┘
                                           |
                                           v
                                       Result
```

Each agent runs a **ReAct loop**: Think → Act (tool call) → Observe (result) → repeat until done.

---

## Agent Types

| Agent | Role | Tools |
|-------|------|-------|
| **Researcher** | Find and synthesize information from the web | web_search, web_browse, browser, file_ops |
| **Coder** | Write, test, and debug code | code_execute, file_ops, shell_command |
| **Analyst** | Analyze datasets and extract insights | data_analyze, code_execute, file_ops |
| **Writer** | Create reports, articles, documentation | file_ops |
| **General** | Flexible agent with access to all tools | All tools |

---

## Tool Reference

| Tool | Description | Safety |
|------|-------------|--------|
| `web_search` | DuckDuckGo search (no API key needed) | Rate limited |
| `web_browse` | Fetch and parse web pages (httpx + BeautifulSoup) | Read-only, timeout |
| `browser` | Full Playwright browser automation | Headless, session-scoped |
| `code_execute` | Run Python/JavaScript/Bash in sandbox | 30s timeout, memory limit, isolated env |
| `file_ops` | Read/write/list/delete files in workspace | Path traversal prevention |
| `data_analyze` | Pandas operations (describe, filter, sort) | Workspace-scoped |
| `shell_command` | Whitelisted commands (ls, grep, find, etc.) | Blocked: rm -rf, sudo, pipes, redirects |
| `ask_human` | Ask the user a question and wait for response | 5-minute timeout |
| `save_to_memory` | Store facts/decisions for later recall | Task-scoped |

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Start the API server
uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

### Optional: Playwright (for browser tool)

```bash
pip install playwright
playwright install chromium
```

---

## Tech Stack

**Backend**: Python 3.13, FastAPI, Anthropic SDK, aiosqlite, httpx, BeautifulSoup, Pandas, Playwright

**Frontend**: React 19, Vite 8, TailwindCSS 4, Zustand, React Router, Lucide Icons, React Markdown

**Database**: SQLite (WAL mode) — tasks, agent_logs, agent_memory

**AI Model**: Claude Sonnet 4 (configurable)

---

## Safety & Sandboxing

- **Code execution**: Subprocess isolation with 30-second timeout and 256MB memory limit. Minimal environment variables (no access to host secrets).
- **File operations**: All paths resolved via `pathlib.Path.resolve()` and validated against workspace root. Directory traversal (`../../`) is blocked.
- **Shell commands**: Explicit whitelist. Dangerous patterns (rm -rf, sudo, pipe chains, redirects) are rejected.
- **Web browsing**: Read-only HTTP requests with timeouts. Browser sessions are headless and per-task.
- **No network sandbox**: Code can make outbound requests. For production use, consider Docker-based sandboxing.

---

## Project Structure

```
autopilot/
├── backend/
│   ├── main.py                  # FastAPI app with lifespan
│   ├── config.py                # Pydantic Settings
│   ├── database.py              # SQLite + schema
│   ├── core/
│   │   ├── agent.py             # ReAct loop engine
│   │   ├── planner.py           # Claude-powered task decomposition
│   │   ├── executor.py          # Parallel plan execution
│   │   ├── memory.py            # Agent memory system
│   │   ├── tool_registry.py     # Tool registration + dispatch
│   │   └── sandbox.py           # Code execution sandbox
│   ├── tools/                   # 9 built-in tools
│   ├── specialists/             # Agent configurations
│   ├── routers/                 # API endpoints
│   └── models/                  # Schemas + DB models
├── frontend/
│   ├── src/
│   │   ├── pages/               # NewTask, TaskDetail, History, Templates, Stats, Settings
│   │   ├── components/          # ExecutionStream, Sidebar, ToolCallCard, WorkspaceViewer, etc.
│   │   ├── store/               # Zustand state management
│   │   ├── hooks/               # WebSocket hook
│   │   └── api/                 # API client
│   └── index.html
└── README.md
```

---

## License

MIT
