# AutoPilot - AI Agent Orchestration Framework

## Overview
A framework for building, deploying, and monitoring autonomous AI agents that can perform multi-step tasks independently. Users define a goal in natural language, and AutoPilot decomposes it into subtasks, spins up specialized agents (researcher, coder, browser, file manager, data analyst), coordinates them, and delivers results with full execution transparency. Think of it as "an open-source Devin/OpenAI Codex but for any task, not just coding."

This is a fundamentally different project from everything else in your portfolio. It's not an app with a UI that wraps an LLM call. It's an agent framework: tool use, chain-of-thought reasoning, memory, self-correction, parallel execution, and human-in-the-loop controls. Any technical founder or CTO who sees this immediately knows you understand the cutting edge of AI engineering.

## Tech Stack
- **Frontend**: React (Vite), TailwindCSS, XTerm.js (terminal emulator in browser)
- **Backend**: Python (FastAPI), asyncio for concurrent agent execution
- **AI**: Claude API (Anthropic) with tool use for agent reasoning
- **Agent Tools**: httpx (web requests), beautifulsoup4 (scraping), subprocess (code execution), sqlite3 (memory), playwright (browser automation)
- **Sandboxing**: Docker containers for safe code execution (optional, fallback to subprocess with restrictions)
- **Database**: SQLite for agent memory, task history, and execution logs
- **Package Manager**: npm for frontend, pip for backend

## IMPORTANT BUILD INSTRUCTIONS
- DO NOT one-shot this build. Break it into the commit blocks below.
- Each block should be a working, testable increment.
- Write clean, well-commented code.
- Test each block before moving to the next.
- Use proper error handling throughout.
- No placeholder or dummy code. Everything should work.
- One commit block per day.

---

## COMMIT BLOCK 1 (Day 1): Core Agent Loop & Tool System

### What to build:
1. Initialize the project structure:
```
autopilot/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── config.py
│   ├── database.py
│   ├── routers/
│   │   ├── tasks.py               # Task CRUD and execution
│   │   ├── agents.py              # Agent status and logs
│   │   └── workspace.py           # File workspace management
│   ├── core/
│   │   ├── agent.py               # Core agent class
│   │   ├── planner.py             # Task decomposition and planning
│   │   ├── executor.py            # Agent execution loop
│   │   ├── memory.py              # Agent memory system
│   │   ├── tool_registry.py       # Tool registration and dispatch
│   │   └── sandbox.py             # Code execution sandbox
│   ├── tools/
│   │   ├── base.py                # Base tool class
│   │   ├── web_search.py          # Web search tool
│   │   ├── web_browse.py          # Full page fetch and parse
│   │   ├── code_execute.py        # Run Python/JS/Bash code
│   │   ├── file_ops.py            # Read, write, list files
│   │   ├── data_analyze.py        # pandas-based data analysis
│   │   ├── shell_command.py       # Run shell commands
│   │   └── ask_human.py           # Request human input/approval
│   ├── specialists/
│   │   ├── researcher.py          # Research-focused agent config
│   │   ├── coder.py               # Code-focused agent config
│   │   ├── analyst.py             # Data analysis agent config
│   │   └── writer.py              # Writing/content agent config
│   ├── models/
│   │   ├── schemas.py
│   │   └── db_models.py
│   └── workspaces/                # Per-task file workspaces
├── frontend/                      # Set up in Block 3
├── sample-tasks/                  # Sample task definitions
├── README.md
└── .gitignore
```

2. Set up FastAPI with CORS and WebSocket support

3. **Build the core agent class** (`core/agent.py`):
   This is the heart of the system. An agent is an LLM with tools, memory, and a reasoning loop.

   ```python
   class Agent:
       def __init__(self, 
                    name: str,
                    role: str,                    # "researcher", "coder", "analyst", "writer", "general"
                    system_prompt: str,
                    tools: List[Tool],
                    max_iterations: int = 25,
                    require_approval: bool = False):
           self.name = name
           self.role = role
           self.system_prompt = system_prompt
           self.tools = tools
           self.max_iterations = max_iterations
           self.require_approval = require_approval
           self.memory = AgentMemory()
           self.conversation_history = []
           self.execution_log = []
           self.status = "idle"              # idle, thinking, acting, waiting_approval, completed, failed
   
       async def run(self, task: str, context: dict = None) -> AgentResult:
           """
           The core agent loop:
           1. Receive task
           2. Think (LLM call with tools available)
           3. If LLM returns tool_use: execute the tool, add result to conversation, go to 2
           4. If LLM returns text (no tool use): task is complete, return result
           5. If max_iterations reached: return partial result with warning
           """
           self.status = "thinking"
           self.conversation_history.append({
               "role": "user", 
               "content": self._build_task_prompt(task, context)
           })
           
           for iteration in range(self.max_iterations):
               # Call Claude with tool use
               response = await self._call_llm()
               
               # Check if response contains tool use
               tool_calls = [block for block in response.content if block.type == "tool_use"]
               
               if not tool_calls:
                   # Agent is done, extract final text response
                   self.status = "completed"
                   return self._build_result(response)
               
               # Execute each tool call
               self.status = "acting"
               for tool_call in tool_calls:
                   if self.require_approval:
                       self.status = "waiting_approval"
                       # Wait for human approval (via WebSocket)
                       approved = await self._wait_for_approval(tool_call)
                       if not approved:
                           continue
                   
                   result = await self._execute_tool(tool_call)
                   self._log_action(tool_call, result)
               
               # Add tool results to conversation and continue loop
               self.status = "thinking"
           
           # Max iterations reached
           self.status = "completed"
           return self._build_result(response, max_iterations_reached=True)
   ```

4. **Build the tool system** (`tools/base.py` and `tool_registry.py`):
   
   ```python
   class Tool:
       name: str
       description: str
       input_schema: dict              # JSON schema for tool parameters
       
       async def execute(self, params: dict, workspace_path: str) -> ToolResult:
           raise NotImplementedError
   
   class ToolResult:
       success: bool
       output: str                     # Text output to feed back to the agent
       data: Any                       # Structured data (optional)
       error: Optional[str]
       execution_time_ms: int
   
   class ToolRegistry:
       def __init__(self):
           self.tools = {}
       
       def register(self, tool: Tool):
           self.tools[tool.name] = tool
       
       def get_tools_for_claude(self) -> List[dict]:
           """Convert tools to Claude API tool format"""
           return [
               {
                   "name": tool.name,
                   "description": tool.description,
                   "input_schema": tool.input_schema
               }
               for tool in self.tools.values()
           ]
       
       async def execute(self, tool_name: str, params: dict, workspace: str) -> ToolResult:
           tool = self.tools[tool_name]
           return await tool.execute(params, workspace)
   ```

5. **Implement the core tools**:

   **web_search.py**:
   - Uses a search API or scrapes Google search results
   - Input: `{"query": "latest React best practices 2026"}`
   - Output: List of search results with titles, URLs, and snippets
   - Limit: 10 results per search

   **web_browse.py**:
   - Fetches a URL and extracts clean text content
   - Input: `{"url": "https://example.com", "extract": "text"}` (options: text, html, links, tables)
   - Uses httpx + beautifulsoup4
   - Returns cleaned text content (truncated to 5000 chars to fit in context)
   - Handles errors: timeouts, blocked, invalid URLs

   **code_execute.py**:
   - Runs Python, JavaScript (Node.js), or Bash code
   - Input: `{"language": "python", "code": "print('hello')"}`
   - Executes in a sandboxed subprocess with:
     - 30-second timeout
     - Memory limit (256MB)
     - No network access from executed code (security)
     - Working directory is the task workspace
   - Returns: stdout, stderr, exit code
   - Captures file outputs (if code writes files to workspace)

   **file_ops.py**:
   - Read, write, append, list, delete files in the task workspace
   - Input: `{"operation": "write", "path": "analysis.md", "content": "# Report\n..."}`
   - Operations: read, write, append, list_dir, delete, rename, exists
   - Sandboxed to the task workspace directory only (no escaping)

   **data_analyze.py**:
   - Load and analyze CSV/JSON data using pandas
   - Input: `{"operation": "describe", "file": "data.csv"}` or `{"operation": "query", "file": "data.csv", "query": "group by category and sum revenue"}`
   - Operations: describe (stats), query (natural language to pandas), plot (generate chart data), filter, sort
   - For "query" operation: sends the column names + sample data + natural language query to Claude to generate pandas code, then executes it
   - Returns: data summary, query results, or chart-ready JSON

   **shell_command.py**:
   - Run shell commands (limited set for safety)
   - Allowed: ls, cat, head, tail, wc, grep, find, curl (GET only), pip install (in workspace venv)
   - Blocked: rm -rf, sudo, chmod, network manipulation, anything outside workspace
   - Input: `{"command": "ls -la workspace/"}`

   **ask_human.py**:
   - Pause execution and request human input
   - Input: `{"question": "I found 3 possible approaches. Which do you prefer?", "options": ["A", "B", "C"]}`
   - Sends a WebSocket message to the frontend
   - Waits for human response before continuing
   - Timeout: 5 minutes (then agent continues with default or skips)

6. **SQLite database setup**:
   ```sql
   CREATE TABLE tasks (
       id TEXT PRIMARY KEY,
       goal TEXT NOT NULL,
       status TEXT DEFAULT 'pending',    -- pending, planning, running, paused, completed, failed
       plan TEXT,                         -- JSON: decomposed subtasks
       result TEXT,                       -- Final output
       workspace_path TEXT,
       created_at TEXT,
       completed_at TEXT,
       total_iterations INTEGER DEFAULT 0,
       total_tokens INTEGER DEFAULT 0,
       total_tool_calls INTEGER DEFAULT 0
   );

   CREATE TABLE agent_logs (
       id TEXT PRIMARY KEY,
       task_id TEXT,
       agent_name TEXT,
       iteration INTEGER,
       action_type TEXT,                  -- "think", "tool_call", "tool_result", "final_answer", "error"
       content TEXT,                      -- The thought, tool call params, tool result, or answer
       tool_name TEXT,
       tokens_used INTEGER,
       duration_ms INTEGER,
       timestamp TEXT,
       FOREIGN KEY (task_id) REFERENCES tasks(id)
   );

   CREATE TABLE agent_memory (
       id TEXT PRIMARY KEY,
       task_id TEXT,
       key TEXT,
       value TEXT,
       memory_type TEXT,                  -- "fact", "decision", "observation", "file_created"
       created_at TEXT,
       FOREIGN KEY (task_id) REFERENCES tasks(id)
   );
   ```

7. **Build the agent memory system** (`core/memory.py`):
   - Short-term: conversation history (auto-managed, last N messages)
   - Working memory: key-value store of facts, decisions, and observations the agent explicitly saves
   - The agent can use a special tool `save_to_memory` to remember important things
   - Memory is injected into the system prompt on each iteration
   - This prevents the agent from losing context over long tasks

   ```python
   class AgentMemory:
       def save(self, key: str, value: str, memory_type: str):
           """Save a fact, decision, or observation"""
       
       def recall(self, key: str) -> Optional[str]:
           """Recall a specific memory"""
       
       def get_context(self) -> str:
           """Get all memories as context string for the system prompt"""
       
       def summarize_history(self, messages: List[dict]) -> str:
           """When conversation gets too long, summarize older messages"""
   ```

8. Create basic API endpoints:
   - `POST /api/tasks` - Create a new task with a goal
   - `GET /api/tasks` - List all tasks
   - `GET /api/tasks/{id}` - Get task with full execution log
   - `POST /api/tasks/{id}/run` - Start executing a task
   - `POST /api/tasks/{id}/pause` - Pause execution
   - `POST /api/tasks/{id}/resume` - Resume execution
   - `POST /api/tasks/{id}/cancel` - Cancel execution
   - WebSocket `/ws/tasks/{id}` - Real-time execution streaming

### Test criteria:
- Agent loop works: task in, LLM thinks, calls tools, gets results, continues, produces final answer
- All 7 tools execute correctly in isolation
- Tool sandboxing prevents file access outside workspace
- Code execution has proper timeout and memory limits
- Agent memory saves and recalls correctly
- WebSocket streams execution events
- Agent stops at max_iterations
- Task state persists in database

### Commit message: `feat: core agent loop, tool system, and 7 built-in tools`

---

## COMMIT BLOCK 2 (Day 2): Task Planner & Specialist Agents

### What to build:

1. **Task planner** (`core/planner.py`):
   - Function: `decompose_task(goal: str) -> TaskPlan`
   - Uses Claude to break a high-level goal into subtasks
   - Each subtask is assigned to a specialist agent type

   ```python
   class SubTask(BaseModel):
       id: str
       title: str
       description: str
       agent_type: str                   # "researcher", "coder", "analyst", "writer", "general"
       dependencies: List[str]           # IDs of subtasks that must complete first
       estimated_complexity: str          # "simple", "moderate", "complex"
       tools_needed: List[str]           # Which tools this subtask likely needs

   class TaskPlan(BaseModel):
       goal: str
       subtasks: List[SubTask]
       execution_order: List[List[str]]  # Grouped by dependency layers (parallel within each layer)
       estimated_total_steps: int
       estimated_duration: str           # "~2 minutes", "~5 minutes"
       requires_human_input: bool
       plan_reasoning: str               # Why the plan was structured this way
   ```

   - The planning prompt should:
     - Analyze the goal and identify what types of work are needed
     - Break into 2-8 subtasks (not too granular)
     - Identify dependencies (what must complete before what)
     - Assign the right specialist to each subtask
     - Identify which subtasks can run in parallel
     - Estimate complexity

2. **Specialist agent configurations** (`specialists/`):

   **researcher.py**:
   ```python
   RESEARCHER_SYSTEM_PROMPT = """You are a research specialist agent. Your job is to find, 
   gather, and synthesize information from the web and provided documents.
   
   You have access to web search and web browsing tools. Use them strategically:
   1. Start with a broad search to understand the landscape
   2. Dive deeper into the most relevant sources
   3. Extract key facts, data, and quotes
   4. Save important findings to memory
   5. Synthesize into a clear summary
   
   Always cite your sources. Verify claims across multiple sources when possible.
   Save key findings to memory as you go so they're not lost."""
   
   RESEARCHER_TOOLS = ["web_search", "web_browse", "file_ops", "save_to_memory"]
   ```

   **coder.py**:
   ```python
   CODER_SYSTEM_PROMPT = """You are a coding specialist agent. Your job is to write, 
   test, and debug code to solve programming tasks.
   
   You have access to code execution and file operations. Your workflow:
   1. Understand the requirements
   2. Plan your approach
   3. Write the code in the workspace
   4. Execute and test it
   5. Debug if there are errors
   6. Iterate until it works correctly
   7. Save the final working code
   
   Write clean, well-commented code. Always test your code by executing it.
   If an execution fails, read the error, fix the code, and try again.
   Maximum 5 debug iterations before asking for human help."""
   
   CODER_TOOLS = ["code_execute", "file_ops", "shell_command", "web_search", "save_to_memory"]
   ```

   **analyst.py**:
   ```python
   ANALYST_SYSTEM_PROMPT = """You are a data analysis specialist agent. Your job is to 
   analyze data, find patterns, and generate insights.
   
   You have access to data analysis tools and code execution. Your workflow:
   1. Load and understand the data structure
   2. Run descriptive statistics
   3. Identify patterns, trends, and anomalies
   4. Generate visualizations if helpful
   5. Write a clear analysis summary with findings
   
   Be specific with numbers. Don't just say 'revenue increased' - say 'revenue 
   increased 23% from $1.2M to $1.5M between Q1 and Q2.'"""
   
   ANALYST_TOOLS = ["data_analyze", "code_execute", "file_ops", "save_to_memory"]
   ```

   **writer.py**:
   ```python
   WRITER_SYSTEM_PROMPT = """You are a writing specialist agent. Your job is to create 
   clear, well-structured written content.
   
   You can research topics, then write articles, reports, documentation, emails, 
   or any other written content. Your workflow:
   1. Understand the writing requirements (tone, audience, length, format)
   2. Research if needed (use web search)
   3. Create an outline
   4. Write the content
   5. Review and refine
   6. Save the final version to the workspace
   
   Write in a natural, human voice. Avoid AI-sounding phrases."""
   
   WRITER_TOOLS = ["web_search", "web_browse", "file_ops", "save_to_memory"]
   ```

3. **Multi-agent executor** (`core/executor.py`):
   - Function: `execute_plan(plan: TaskPlan, workspace: str) -> TaskResult`
   - Executes subtasks according to the plan:
     1. Start with subtasks that have no dependencies
     2. Run independent subtasks sequentially (parallel is nice-to-have)
     3. Pass outputs from completed subtasks as context to dependent subtasks
     4. Track progress per subtask
     5. If a subtask fails, decide whether to retry, skip, or abort
   - Final synthesis: after all subtasks complete, run a final Claude call to synthesize all agent outputs into a cohesive final result

   ```python
   class SubTaskResult(BaseModel):
       subtask_id: str
       agent_name: str
       status: str                       # "completed", "failed", "skipped"
       output: str
       files_created: List[str]
       iterations_used: int
       tokens_used: int
       duration_ms: int
       error: Optional[str]

   class TaskResult(BaseModel):
       task_id: str
       status: str
       plan: TaskPlan
       subtask_results: List[SubTaskResult]
       final_output: str                 # Synthesized final result
       files_created: List[str]          # All files in workspace
       total_iterations: int
       total_tokens: int
       total_duration_ms: int
       total_tool_calls: int
   ```

4. **Self-correction mechanism**:
   - If a tool call fails, the agent sees the error and can:
     - Retry with different parameters
     - Try a different approach
     - Ask for human help
   - If code execution fails, the agent gets the error message and tries to fix the code
   - Track retry count per tool call (max 3 retries)
   - After 3 retries, move on or escalate

5. **Context passing between agents**:
   - When Agent A completes and Agent B depends on it:
     - Agent B receives a context summary: "Previous agent [name] completed [subtask]. Key findings: [summary]. Files created: [list]."
     - Agent B can read files created by Agent A from the shared workspace
   - This enables genuine multi-agent collaboration

6. Create endpoints:
   - `POST /api/tasks/{id}/plan` - Generate a plan without executing
     - Returns the TaskPlan for user review
   - `POST /api/tasks/{id}/execute` - Execute the plan (or plan + execute if no plan exists)
   - `GET /api/tasks/{id}/plan` - Get the current plan
   - `PUT /api/tasks/{id}/plan` - Edit the plan before executing (reorder subtasks, change agent types)
   - `GET /api/tasks/{id}/agents` - Get status of all agents in the task

### Test criteria:
- Planner decomposes complex tasks into reasonable subtasks
- Subtask dependencies are correctly identified
- Specialist agents use appropriate tools for their role
- Context passes correctly between agents
- Self-correction works (agent retries on failure)
- Failed subtasks don't crash the entire execution
- Plan can be viewed and edited before execution
- Multi-step tasks complete end-to-end

### Commit message: `feat: task planner, specialist agents, and multi-agent executor`

---

## COMMIT BLOCK 3 (Day 3): Frontend - Task Interface & Live Execution View

### What to build:
1. Initialize React app with Vite, TailwindCSS, XTerm.js
2. Install: `zustand`, `@xterm/xterm`, `socket.io-client`, `lucide-react`, `react-markdown`
3. Set up project structure:
```
frontend/
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   ├── components/
│   │   ├── Layout.jsx
│   │   ├── Sidebar.jsx
│   │   ├── TaskInput.jsx               # Goal input
│   │   ├── PlanView.jsx                # Task plan display
│   │   ├── ExecutionStream.jsx         # Live execution feed
│   │   ├── AgentCard.jsx               # Agent status card
│   │   ├── ToolCallCard.jsx            # Tool execution display
│   │   ├── ThoughtBubble.jsx           # Agent thinking display
│   │   ├── WorkspaceViewer.jsx         # File workspace browser
│   │   ├── TerminalView.jsx            # XTerm.js terminal for code execution
│   │   ├── ApprovalModal.jsx           # Human approval request
│   │   ├── TaskResult.jsx              # Final results display
│   │   └── TaskHistory.jsx             # Past tasks list
│   ├── pages/
│   │   ├── NewTaskPage.jsx
│   │   ├── TaskDetailPage.jsx
│   │   └── HistoryPage.jsx
│   ├── store/
│   │   └── taskStore.js
│   ├── api/
│   │   └── client.js
│   └── hooks/
│       └── useWebSocket.js             # WebSocket hook for live updates
├── package.json
├── vite.config.js
└── tailwind.config.js
```

4. **NewTaskPage.jsx**:
   - Large text input: "What do you want me to do?"
   - Placeholder examples cycling through:
     - "Research the top 5 CRM tools for startups and create a comparison report"
     - "Build a Python script that scrapes Hacker News and saves top stories to CSV"
     - "Analyze this sales data and create a summary with charts"
     - "Write a technical blog post about RAG pipelines"
   - "Plan" button (generates plan for review) and "Run" button (plan + execute immediately)
   - Optional file upload area: "Attach files for the agent to work with"
   - Settings toggle:
     - Require approval for tool calls (yes/no)
     - Max iterations per agent (slider: 5-50)
   - Quick task templates (cards):
     - "Research & Report", "Build a Script", "Analyze Data", "Write Content"
     - Clicking fills the input with a template prompt

5. **PlanView.jsx** (shown after planning, before execution):
   - Visual flowchart of subtasks:
     - Each subtask as a card with: title, description, agent type badge, complexity badge
     - Arrows showing dependencies
     - Parallel subtasks shown side by side
   - "Edit Plan" mode:
     - Reorder subtasks
     - Change agent type
     - Edit description
     - Add/remove subtasks
   - Estimated duration and complexity
   - "Execute Plan" button
   - "Re-plan" button

6. **ExecutionStream.jsx** (the main event during execution):
   - Real-time feed of agent activity via WebSocket:
     - **Thinking events**: Agent's reasoning shown as thought bubbles (italic, muted)
     - **Tool calls**: Shown as action cards with tool name, parameters, and result
       - Web search: show query and result snippets
       - Code execution: show code in a syntax-highlighted block, then output
       - File operations: show file name and operation
       - Web browse: show URL and extracted content preview
     - **Agent transitions**: "Researcher completed. Handing off to Coder."
     - **Human approval requests**: Modal popup with description and approve/reject buttons
   - Each event timestamped and colored by type:
     - Thinking: gray
     - Tool call: blue
     - Tool result: green (success) or red (error)
     - Agent transition: purple
     - Human request: amber
   - Auto-scroll to latest event
   - Collapsible events (expand to see full details)
   - Progress indicator: "Agent 2/4 | Iteration 3/25 | Tools used: 7"

7. **AgentCard.jsx** (sidebar during execution):
   - Shows all agents in the task:
     - Agent name and role badge
     - Status: idle, thinking, acting, waiting, completed, failed
     - Iterations used
     - Tools called count
     - Spinner animation when active
   - Active agent highlighted

8. **WebSocket hook** (`useWebSocket.js`):
   - Connect to `/ws/tasks/{id}`
   - Handle event types: plan_update, agent_start, thinking, tool_call, tool_result, agent_complete, human_request, task_complete, error
   - Dispatch events to the Zustand store
   - Auto-reconnect on disconnect

### Design direction:
- **Hacker aesthetic**: Dark theme (#0D1117), monospace fonts for agent output, terminal-green accents (#00FF41 or #3FB950)
- Think GitHub Copilot workspace meets a terminal
- Execution stream: chat-like feed with different card styles per event type
- Thinking events: subtle, italic, gray text with a brain icon
- Tool calls: bordered cards with tool icon, inputs collapsed by default
- Code execution: dark code block with syntax highlighting, output below
- Agent cards: compact, status-indicator dot (green pulse when active)
- The overall feel should be watching an AI work in real-time

### Test criteria:
- Task input creates a task and triggers planning
- Plan displays with correct dependency graph
- WebSocket connects and streams events in real-time
- Execution feed shows all event types correctly
- Agent cards update status in real-time
- Human approval modal appears and works
- Auto-scroll follows execution
- Past events are expandable/collapsible

### Commit message: `feat: task interface, live execution stream, and real-time WebSocket updates`

---

## COMMIT BLOCK 4 (Day 4): Workspace, Terminal & Results View

### What to build:

1. **WorkspaceViewer.jsx** (file browser for agent's workspace):
   - Tree view of all files in the task workspace
   - Click a file to preview:
     - Code files: syntax highlighted (use a lightweight code highlighter)
     - Markdown: rendered
     - CSV/JSON: table view
     - Images: displayed inline
     - Other: raw text
   - File metadata: size, last modified, created by which agent
   - "Download" button per file
   - "Download All" button (zip the workspace)
   - Files update in real-time as agents create/modify them

2. **TerminalView.jsx** (embedded terminal):
   - Uses XTerm.js to show code execution output
   - When a coder agent runs code:
     - Show the command in green: `$ python script.py`
     - Show stdout in white
     - Show stderr in red
     - Show exit code
   - Shell commands also displayed here
   - Read-only (user can't type, this is the agent's terminal)
   - Scrollable history of all executions in this task

3. **TaskResult.jsx** (final results view):
   - Shown when task completes
   - **Summary section**:
     - Final synthesized output (markdown rendered)
     - Overall status badge
   - **Deliverables section**:
     - List of files created with previews
     - Download links
   - **Execution stats**:
     - Total time
     - Agents used
     - Iterations across all agents
     - Tool calls breakdown (pie chart or bar chart)
     - Tokens used (with estimated cost)
   - **Execution timeline**:
     - Visual timeline showing each agent's active period
     - Overlapping bars for parallel agents (if implemented)
   - **"Run Follow-up" button**: Ask a follow-up task that builds on this one's workspace
   - **"Re-run" button**: Run the same task again (useful for iterating)

4. **Follow-up tasks**:
   - After a task completes, user can type a follow-up
   - The follow-up task inherits:
     - The workspace (all files from the previous task)
     - The memory (facts, decisions, observations)
     - Summary of what was done previously (as context)
   - This enables iterative workflows: "Research X" -> "Now write a report based on that research" -> "Now create a presentation from that report"

5. **Task workspace management** (backend):
   - Each task gets a directory: `workspaces/{task_id}/`
   - Files created by agents go here
   - Endpoint: `GET /api/tasks/{id}/workspace` - List all files
   - Endpoint: `GET /api/tasks/{id}/workspace/{filepath}` - Get file content
   - Endpoint: `GET /api/tasks/{id}/workspace/download` - Download workspace as zip
   - Follow-up tasks can reference parent workspace

6. **Execution replay**:
   - After a task completes, the execution stream becomes a replay
   - User can scroll through all events
   - Each event has a timestamp
   - "Jump to agent" buttons to skip to specific agent's contribution
   - This is valuable for understanding how the agent solved the problem

7. **Error recovery UI**:
   - If a task fails, show:
     - Which agent failed
     - What tool call caused the failure
     - The error message
     - Options: "Retry from this point", "Skip this step", "Cancel"
   - "Retry from this point" replays from the failed step with the same context

### Design direction:
- Workspace viewer: file tree on left (like VS Code sidebar), preview on right
- Terminal: black background, monospace font, classic terminal look
- Results: clean, professional report-like layout
- Stats: compact cards with key metrics
- Timeline: horizontal bar chart showing agent activity over time
- The workspace + terminal + execution stream should feel like a development environment

### Test criteria:
- Workspace shows all files created by agents
- File preview works for code, markdown, CSV, JSON
- Terminal displays code execution output correctly
- Results page shows synthesized output with stats
- Follow-up tasks inherit workspace and memory
- Download workspace as zip works
- Execution replay is scrollable with timestamps
- Error recovery options work

### Commit message: `feat: workspace viewer, terminal output, results view, and follow-up tasks`

---

## COMMIT BLOCK 5 (Day 5): Advanced Features - Browser Agent, Parallel Execution & Templates

### What to build:

1. **Browser automation tool** (`tools/browser.py`):
   - Uses Playwright (headless Chrome) for full browser automation
   - More powerful than simple web_browse: can handle JavaScript-rendered pages, fill forms, click buttons
   - Actions:
     - `navigate(url)`: Go to a URL
     - `screenshot()`: Take a screenshot of the current page
     - `extract_text(selector?)`: Extract text from page or specific element
     - `click(selector)`: Click an element
     - `fill(selector, text)`: Fill a form field
     - `get_links()`: Get all links on the page
     - `wait(selector)`: Wait for an element to appear
     - `evaluate(js_code)`: Run JavaScript on the page
   - Safety: no login actions, no payment actions, no form submissions to external sites
   - Browser sessions are per-task and destroyed after completion
   - Make Playwright optional (falls back to httpx if not installed)

2. **Parallel subtask execution**:
   - When the plan has independent subtasks (no dependencies between them), run them concurrently
   - Use asyncio to run multiple agents simultaneously
   - Merge outputs when all parallel agents complete
   - Progress tracking shows parallel agents running side by side
   - WebSocket streams events from all active agents (tagged with agent name)
   - Frontend shows parallel agents in separate columns or with agent name tags on each event

3. **Task templates** (pre-built workflows):
   
   **Template 1: "Competitive Research Report"**
   - Goal: "Research [company/product] and its top 3 competitors. Create a comparison report."
   - Plan: Research agent (search for company) -> Research agent (search for competitors) -> Writer agent (create report)
   
   **Template 2: "Build a Data Pipeline Script"**
   - Goal: "Write a Python script that [reads/transforms/outputs data]"
   - Plan: Coder agent (write script) -> Coder agent (test script) -> Writer agent (write README)
   
   **Template 3: "Analyze CSV and Generate Report"**
   - Goal: "Analyze the uploaded CSV and create an insights report"
   - Plan: Analyst agent (analyze data) -> Writer agent (write report with findings)
   
   **Template 4: "Technical Blog Post"**
   - Goal: "Research and write a technical blog post about [topic]"
   - Plan: Researcher agent (research topic) -> Writer agent (write draft) -> Writer agent (review and polish)
   
   **Template 5: "Market Research"**
   - Goal: "Research the [industry] market, key players, trends, and opportunities"
   - Plan: Researcher agent (industry overview) -> Researcher agent (key players) -> Researcher agent (trends) -> Writer agent (synthesize report)

4. **Agent capability improvements**:
   - **Conversation summarization**: When conversation history exceeds 20 messages, summarize older messages to save tokens
   - **Tool result truncation**: If a tool returns > 5000 chars, summarize the result before adding to conversation
   - **Smart retry**: If a web search returns no results, try reformulated queries
   - **Progress estimation**: Agent reports estimated progress percentage based on subtask completion

5. **Cost tracking**:
   - Track tokens used per agent per task
   - Calculate estimated cost (Claude Sonnet: ~$3/M input, $15/M output tokens)
   - Show running cost during execution
   - Show final cost breakdown in results
   - Cumulative cost across all tasks in history

6. Create endpoints:
   - `GET /api/templates` - List available templates
   - `POST /api/templates/{id}/use` - Create a task from a template
   - `GET /api/stats` - Get usage statistics (total tasks, tokens, costs)

### Test criteria:
- Browser tool navigates pages and extracts content
- Parallel agents run simultaneously and merge correctly
- All 5 templates work end-to-end
- Conversation summarization keeps agent effective over long tasks
- Cost tracking shows accurate estimates
- Browser fallback works when Playwright isn't installed
- Parallel execution shows correctly in frontend (events from multiple agents)

### Commit message: `feat: browser automation, parallel execution, templates, and cost tracking`

---

## COMMIT BLOCK 6 (Day 6): Polish, Sample Tasks & README

### What to build:

1. **Sample tasks with pre-cached results**:
   - "Try AutoPilot" section on the new task page
   - 3 pre-loaded tasks with cached execution logs and results:
     - "Research the top 5 AI coding assistants and create a comparison table"
     - "Write a Python script that generates a random maze and solves it"
     - "Analyze the sample sales data and create a summary report"
   - Clicking loads the cached execution replay (shows the full agent workflow without making API calls)
   - This is critical for portfolio demos

2. **Task history page**:
   - List of all past tasks with:
     - Goal text (truncated)
     - Status badge
     - Duration
     - Agents used
     - Token cost
     - Date
   - Click to view full execution replay and results
   - Search by goal text
   - Filter by status

3. **Keyboard shortcuts**:
   - `Cmd+Enter`: Submit task
   - `Cmd+P`: Pause execution
   - `Cmd+R`: Resume execution
   - `Escape`: Cancel task or close modal
   - `?`: Show shortcuts

4. **Settings page**:
   - Default model selection (Claude Sonnet vs Haiku for cost management)
   - Default max iterations
   - Default approval mode (auto vs manual)
   - API key configuration
   - Clear all task history

5. **Polish**:
   - Loading skeletons for task history, plan view
   - Toast notifications: task started, agent completed, task finished, error
   - Smooth animations on execution stream events (fade in sequentially)
   - Empty states: no tasks yet, no files in workspace
   - Error boundaries
   - Mobile: show message "Use desktop for AutoPilot" (complex UI needs screen width)
   - Agent thinking animation: subtle dots animation (...) while agent is processing

6. **README.md**:
   - **Hero**: "AutoPilot" with tagline "Autonomous AI agents that plan, research, code, and deliver"
   - **The Problem**: "Complex tasks require multiple skills: researching, coding, analyzing data, writing. Current AI tools handle one step at a time, requiring constant human prompting and context-switching. Nobody has time to babysit an LLM through a 20-step process."
   - **The Solution**: "AutoPilot decomposes complex goals into subtasks, assigns specialist AI agents (researcher, coder, analyst, writer), coordinates them with shared memory and workspace, and delivers results with full execution transparency. Watch your agents think, act, and collaborate in real-time."
   - **Features**:
     - Natural language task input
     - Automatic task decomposition and planning
     - 4 specialist agent types with tailored tool sets
     - 8 built-in tools (web search, browse, code execution, file ops, data analysis, shell, browser automation, human approval)
     - Real-time execution streaming via WebSocket
     - Shared workspace and memory between agents
     - Human-in-the-loop approval for sensitive actions
     - Follow-up tasks that build on previous work
     - Full execution replay and audit trail
     - Cost tracking and token usage analytics
     - Pre-built task templates
   - **Architecture**: Diagram showing Goal -> Planner (Claude) -> Task Plan -> Executor -> [Agent 1 + Tools] -> [Agent 2 + Tools] -> Synthesizer -> Final Result
   - **Agent Types**: Table of specialist agents with their tools and use cases
   - **Tool Reference**: Table of all tools with descriptions, inputs, and safety constraints
   - **Getting Started**: Setup instructions
     - Note: Playwright is optional (for browser automation)
     - Note: Docker is optional (for sandboxed code execution)
   - **Screenshots**: 8-10 screenshots
   - **Safety & Sandboxing**: Explanation of security measures

7. **Screenshots**: Capture:
   - New task input page
   - Task plan visualization
   - Live execution stream with thinking + tool calls
   - Code execution in terminal view
   - Agent cards showing parallel execution
   - Workspace file browser with file preview
   - Human approval modal
   - Task results with stats
   - Execution timeline
   - Task history page
   - Store in `/screenshots`

8. **.env.example**:
   ```
   ANTHROPIC_API_KEY=your_key_here
   SANDBOX_MODE=subprocess              # "subprocess" or "docker"
   MAX_ITERATIONS_PER_AGENT=25
   MAX_CODE_EXECUTION_TIME=30           # seconds
   ENABLE_BROWSER_TOOL=false            # Requires Playwright
   ```

9. **Code cleanup**

### Commit message: `docs: sample tasks, task history, settings, README, and polish`

---

## Portfolio Framing

**Title**: AutoPilot - AI Agent Orchestration Framework

**Client context**: "Built for an AI consultancy that needed to automate complex, multi-step research and development tasks. Their team was spending hours manually prompting LLMs through sequences of research, coding, analysis, and writing that could be automated."

**Problem**: "Complex tasks require multiple skills and dozens of steps. Current AI tools handle one prompt at a time. There's no system that can take a high-level goal, break it into steps, assign specialist agents, coordinate them, and deliver a complete result autonomously."

**Solution**: "An autonomous agent framework that decomposes goals into subtasks, spins up specialist AI agents (researcher, coder, analyst, writer), equips them with tools (web search, code execution, file management, browser automation), coordinates them with shared memory and workspace, and delivers results with full execution transparency."

**My role**: "System architecture, agent loop design, tool sandboxing, real-time WebSocket infrastructure, multi-agent coordination, and full-stack UI."

**Results**: "Reduced a 3-hour competitive research task to 8 minutes of autonomous agent work. Automated end-to-end data analysis pipelines that previously required manual prompting across 15+ steps. Enabled non-technical team members to trigger complex technical workflows with a single sentence."

**Tech**: Python, FastAPI, React, TailwindCSS, Claude API (tool use), WebSocket, XTerm.js, Playwright, SQLite, asyncio

**Link**: GitHub repo link | Live demo link

---

## Notes for Claude Code
- Use Python 3.11+ syntax with `async/await` throughout
- Use the official `anthropic` SDK with tool use (beta). Tool use format:
  ```python
  response = client.messages.create(
      model="claude-sonnet-4-20250514",
      max_tokens=4096,
      system=system_prompt,
      tools=tool_definitions,
      messages=conversation_history
  )
  ```
- Handle tool_use and tool_result content blocks properly in the conversation loop
- FastAPI WebSocket: use `@app.websocket("/ws/tasks/{task_id}")` with `websocket.send_json()`
- Frontend WebSocket: native `WebSocket` API or `socket.io-client`
- XTerm.js: `@xterm/xterm` package, use `terminal.write()` to display output
- Zustand for state management
- FastAPI on port 8000, Vite on port 5173
- Proxy config in vite.config.js for /api AND /ws routes
- All API routes prefixed with /api
- Code execution sandboxing: use `subprocess.run()` with `timeout`, `cwd`, and environment restrictions. For proper sandboxing, use Docker if available.
- File operations MUST be sandboxed to the task workspace. Use `os.path.realpath()` to prevent path traversal.
- Playwright: `pip install playwright && playwright install chromium`. Make it optional with a try/except import.
- Agent conversation history management: keep last 20 messages, summarize older ones to save tokens.
- WebSocket events should include: `{type, agent_name, data, timestamp}` format.
- Pre-cached sample tasks: store as JSON files in `sample-tasks/` with full execution logs and results.
