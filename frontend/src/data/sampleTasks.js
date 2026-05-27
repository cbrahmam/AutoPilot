export const SAMPLE_TASKS = [
  {
    id: 'demo-ai-assistants',
    goal: 'Research the top 5 AI coding assistants and create a comparison table',
    status: 'completed',
    created_at: '2025-01-15T10:00:00Z',
    completed_at: '2025-01-15T10:03:42Z',
    total_iterations: 12,
    total_tokens: 18400,
    total_tool_calls: 8,
    result: `# AI Coding Assistants Comparison

## Top 5 AI Coding Assistants (2025)

| Feature | GitHub Copilot | Cursor | Claude Code | Codeium | Amazon Q Developer |
|---------|---------------|--------|-------------|---------|-------------------|
| **Model** | GPT-4o / Claude | Claude / GPT-4 | Claude Opus/Sonnet | Custom | Custom + Bedrock |
| **IDE Support** | VS Code, JetBrains, Neovim | Own IDE (VS Code fork) | CLI, VS Code, JetBrains | VS Code, JetBrains, Vim | VS Code, JetBrains |
| **Pricing** | $10-39/mo | $20-40/mo | Per-usage | Free tier + $15/mo | Free tier + $19/mo |
| **Key Strength** | Ecosystem integration | Full-IDE AI experience | Agentic coding | Free tier generous | AWS integration |
| **Context** | Repository-wide | Full codebase | Full codebase | File-level | Project-level |
| **Multi-file Edit** | Limited | Yes | Yes | Limited | Yes |
| **Terminal Integration** | Yes | Yes | Native CLI | No | Yes |

## Key Findings

1. **Claude Code** leads in agentic capabilities — autonomous multi-file changes with planning
2. **Cursor** offers the best integrated IDE experience with AI-first design
3. **GitHub Copilot** has the widest ecosystem but is catching up on agentic features
4. **Codeium** is the best free option for individual developers
5. **Amazon Q** is ideal for teams already in the AWS ecosystem`,
    events: [
      { type: 'agent_start', agent_name: 'researcher_s1', data: { agent_type: 'researcher', subtask_id: 's1', title: 'Research AI coding assistants' }, timestamp: '2025-01-15T10:00:01Z' },
      { type: 'thinking', agent_name: 'researcher_s1', data: { text: "I'll search for the latest AI coding assistants and gather information about their features, pricing, and capabilities." }, timestamp: '2025-01-15T10:00:02Z' },
      { type: 'tool_call', agent_name: 'researcher_s1', data: { tool_name: 'web_search', tool_input: { query: 'best AI coding assistants 2025 comparison' }, tool_use_id: 'tc1' }, timestamp: '2025-01-15T10:00:03Z' },
      { type: 'tool_result', agent_name: 'researcher_s1', data: { tool_name: 'web_search', tool_use_id: 'tc1', success: true, output: 'Found 10 results for AI coding assistants...', execution_time_ms: 1200 }, timestamp: '2025-01-15T10:00:04Z' },
      { type: 'thinking', agent_name: 'researcher_s1', data: { text: "Good results. Let me dive deeper into each tool's official pages to get accurate pricing and feature details." }, timestamp: '2025-01-15T10:00:06Z' },
      { type: 'tool_call', agent_name: 'researcher_s1', data: { tool_name: 'web_browse', tool_input: { url: 'https://github.com/features/copilot', extract: 'text' }, tool_use_id: 'tc2' }, timestamp: '2025-01-15T10:00:07Z' },
      { type: 'tool_result', agent_name: 'researcher_s1', data: { tool_name: 'web_browse', tool_use_id: 'tc2', success: true, output: 'GitHub Copilot features page content...', execution_time_ms: 2100 }, timestamp: '2025-01-15T10:00:09Z' },
      { type: 'tool_call', agent_name: 'researcher_s1', data: { tool_name: 'web_browse', tool_input: { url: 'https://cursor.com', extract: 'text' }, tool_use_id: 'tc3' }, timestamp: '2025-01-15T10:00:10Z' },
      { type: 'tool_result', agent_name: 'researcher_s1', data: { tool_name: 'web_browse', tool_use_id: 'tc3', success: true, output: 'Cursor IDE features...', execution_time_ms: 1800 }, timestamp: '2025-01-15T10:00:12Z' },
      { type: 'thinking', agent_name: 'researcher_s1', data: { text: "I have enough data to create a comprehensive comparison. Let me write the report with a detailed comparison table." }, timestamp: '2025-01-15T10:00:14Z' },
      { type: 'tool_call', agent_name: 'researcher_s1', data: { tool_name: 'file_ops', tool_input: { operation: 'write', path: 'comparison-report.md', content: '# AI Coding Assistants Comparison...' }, tool_use_id: 'tc4' }, timestamp: '2025-01-15T10:00:15Z' },
      { type: 'tool_result', agent_name: 'researcher_s1', data: { tool_name: 'file_ops', tool_use_id: 'tc4', success: true, output: 'Written 2.1KB to comparison-report.md', execution_time_ms: 5 }, timestamp: '2025-01-15T10:00:15Z' },
      { type: 'agent_complete', agent_name: 'researcher_s1', data: { agent_name: 'researcher_s1', subtask_id: 's1', status: 'completed', duration_ms: 14000 }, timestamp: '2025-01-15T10:00:15Z' },
      { type: 'complete', agent_name: 'executor', data: { success: true, output: 'Task completed successfully', subtasks_completed: 1 }, timestamp: '2025-01-15T10:00:16Z' },
    ],
  },
  {
    id: 'demo-maze-solver',
    goal: 'Write a Python script that generates a random maze and solves it',
    status: 'completed',
    created_at: '2025-01-15T11:00:00Z',
    completed_at: '2025-01-15T11:02:18Z',
    total_iterations: 8,
    total_tokens: 12600,
    total_tool_calls: 6,
    result: `# Maze Generator & Solver

Created \`maze.py\` — a Python script that:
1. **Generates** random mazes using recursive backtracking (DFS)
2. **Solves** them using BFS (breadth-first search) for shortest path
3. **Renders** the maze to terminal with Unicode box-drawing characters

## Usage
\`\`\`bash
python maze.py           # 21x21 default maze
python maze.py 41 41     # custom size (must be odd numbers)
\`\`\`

## Output Example
\`\`\`
████████████████████
█ S █       █     █
█ █ ███ ███ █ ███ █
█ █       █ █   █ █
█ ███████ █ ███ █ █
█         █     █ █
█ █████████████ █ █
█               █ E█
████████████████████
Path found! Length: 34 steps
\`\`\`

The script was tested and runs successfully with exit code 0.`,
    events: [
      { type: 'agent_start', agent_name: 'coder_s1', data: { agent_type: 'coder', subtask_id: 's1', title: 'Write maze generator and solver' }, timestamp: '2025-01-15T11:00:01Z' },
      { type: 'thinking', agent_name: 'coder_s1', data: { text: "I'll write a Python script with maze generation (DFS/recursive backtracking) and solving (BFS for shortest path)." }, timestamp: '2025-01-15T11:00:02Z' },
      { type: 'tool_call', agent_name: 'coder_s1', data: { tool_name: 'file_ops', tool_input: { operation: 'write', path: 'maze.py', content: 'import random\nimport sys\nfrom collections import deque...' }, tool_use_id: 'tc1' }, timestamp: '2025-01-15T11:00:05Z' },
      { type: 'tool_result', agent_name: 'coder_s1', data: { tool_name: 'file_ops', tool_use_id: 'tc1', success: true, output: 'Written 3.4KB to maze.py', execution_time_ms: 4 }, timestamp: '2025-01-15T11:00:05Z' },
      { type: 'thinking', agent_name: 'coder_s1', data: { text: "Now let me run the script to verify it works correctly." }, timestamp: '2025-01-15T11:00:06Z' },
      { type: 'tool_call', agent_name: 'coder_s1', data: { tool_name: 'code_execute', tool_input: { language: 'python', code: 'exec(open("maze.py").read())' }, tool_use_id: 'tc2' }, timestamp: '2025-01-15T11:00:07Z' },
      { type: 'tool_result', agent_name: 'coder_s1', data: { tool_name: 'code_execute', tool_use_id: 'tc2', success: true, output: 'STDOUT:\n████████████████████\n█ S █   ...   █ E█\n████████████████████\nPath found! Length: 34 steps\nExit code: 0', execution_time_ms: 450 }, timestamp: '2025-01-15T11:00:08Z' },
      { type: 'agent_complete', agent_name: 'coder_s1', data: { agent_name: 'coder_s1', subtask_id: 's1', status: 'completed', duration_ms: 7000 }, timestamp: '2025-01-15T11:00:08Z' },
      { type: 'complete', agent_name: 'executor', data: { success: true, output: 'Task completed', subtasks_completed: 1 }, timestamp: '2025-01-15T11:00:09Z' },
    ],
  },
  {
    id: 'demo-sales-analysis',
    goal: 'Analyze the sample sales data and create a summary report',
    status: 'completed',
    created_at: '2025-01-15T12:00:00Z',
    completed_at: '2025-01-15T12:04:05Z',
    total_iterations: 15,
    total_tokens: 22100,
    total_tool_calls: 10,
    result: `# Sales Data Analysis Report

## Executive Summary
Analysis of 1,247 transactions from Q1-Q4 2024 reveals **$2.4M total revenue** with a **23% YoY growth rate**. The Electronics category dominates at 38% of revenue.

## Key Metrics
| Metric | Value |
|--------|-------|
| Total Revenue | $2,418,350 |
| Total Orders | 1,247 |
| Avg Order Value | $1,938 |
| Top Category | Electronics (38%) |
| Top Region | West Coast (31%) |
| Growth Rate (YoY) | +23.4% |

## Insights

1. **Seasonal Patterns**: Q4 accounts for 34% of annual revenue (holiday effect)
2. **Regional Growth**: West Coast grew 31% while Midwest declined 5%
3. **Product Mix**: Electronics + SaaS subscriptions = 62% of revenue
4. **Customer Segments**: Enterprise clients (12% of customers) drive 58% of revenue
5. **Concerning Trend**: Average order value declining in Q3/Q4 despite volume growth

## Recommendations
- Double down on West Coast expansion
- Investigate Midwest decline — may need regional pricing adjustment
- Develop enterprise retention program (high-value, low-volume segment)
- Prepare for Q4 capacity — hire seasonal support by September`,
    events: [
      { type: 'layer_start', agent_name: 'executor', data: { layer: 1, total_layers: 2, subtask_ids: ['s1'] }, timestamp: '2025-01-15T12:00:01Z' },
      { type: 'agent_start', agent_name: 'analyst_s1', data: { agent_type: 'analyst', subtask_id: 's1', title: 'Analyze sales data' }, timestamp: '2025-01-15T12:00:02Z' },
      { type: 'thinking', agent_name: 'analyst_s1', data: { text: "Let me start by examining the CSV structure and running statistical analysis on the sales data." }, timestamp: '2025-01-15T12:00:03Z' },
      { type: 'tool_call', agent_name: 'analyst_s1', data: { tool_name: 'data_analyze', tool_input: { operation: 'describe', file_path: 'sales_data.csv' }, tool_use_id: 'tc1' }, timestamp: '2025-01-15T12:00:04Z' },
      { type: 'tool_result', agent_name: 'analyst_s1', data: { tool_name: 'data_analyze', tool_use_id: 'tc1', success: true, output: 'DataFrame: 1247 rows, 8 columns\nRevenue: mean=$1938, std=$845...', execution_time_ms: 320 }, timestamp: '2025-01-15T12:00:04Z' },
      { type: 'tool_call', agent_name: 'analyst_s1', data: { tool_name: 'code_execute', tool_input: { language: 'python', code: 'import pandas as pd\ndf = pd.read_csv("sales_data.csv")\nprint(df.groupby("category")["revenue"].sum().sort_values(ascending=False))' }, tool_use_id: 'tc2' }, timestamp: '2025-01-15T12:00:06Z' },
      { type: 'tool_result', agent_name: 'analyst_s1', data: { tool_name: 'code_execute', tool_use_id: 'tc2', success: true, output: 'STDOUT:\nElectronics    918973\nSaaS           580042\nConsulting     497891\nHardware       421444\nExit code: 0', execution_time_ms: 890 }, timestamp: '2025-01-15T12:00:07Z' },
      { type: 'agent_complete', agent_name: 'analyst_s1', data: { agent_name: 'analyst_s1', subtask_id: 's1', status: 'completed', duration_ms: 12000 }, timestamp: '2025-01-15T12:00:14Z' },
      { type: 'progress', agent_name: 'executor', data: { completed: 1, total: 2, percentage: 50 }, timestamp: '2025-01-15T12:00:14Z' },
      { type: 'layer_start', agent_name: 'executor', data: { layer: 2, total_layers: 2, subtask_ids: ['s2'] }, timestamp: '2025-01-15T12:00:15Z' },
      { type: 'agent_start', agent_name: 'writer_s2', data: { agent_type: 'writer', subtask_id: 's2', title: 'Write insights report' }, timestamp: '2025-01-15T12:00:16Z' },
      { type: 'thinking', agent_name: 'writer_s2', data: { text: "I have the analysis results. Let me synthesize these into a clear executive report with actionable recommendations." }, timestamp: '2025-01-15T12:00:17Z' },
      { type: 'tool_call', agent_name: 'writer_s2', data: { tool_name: 'file_ops', tool_input: { operation: 'write', path: 'sales-report.md', content: '# Sales Data Analysis Report...' }, tool_use_id: 'tc3' }, timestamp: '2025-01-15T12:00:20Z' },
      { type: 'tool_result', agent_name: 'writer_s2', data: { tool_name: 'file_ops', tool_use_id: 'tc3', success: true, output: 'Written 1.8KB to sales-report.md', execution_time_ms: 3 }, timestamp: '2025-01-15T12:00:20Z' },
      { type: 'agent_complete', agent_name: 'writer_s2', data: { agent_name: 'writer_s2', subtask_id: 's2', status: 'completed', duration_ms: 5000 }, timestamp: '2025-01-15T12:00:21Z' },
      { type: 'progress', agent_name: 'executor', data: { completed: 2, total: 2, percentage: 100 }, timestamp: '2025-01-15T12:00:21Z' },
      { type: 'complete', agent_name: 'executor', data: { success: true, output: 'Report generated', subtasks_completed: 2 }, timestamp: '2025-01-15T12:00:22Z' },
    ],
  },
];
