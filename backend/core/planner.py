import json
import anthropic
from config import settings
from models.schemas import TaskPlan, SubTask

PLANNING_PROMPT = """You are a task planning agent. Your job is to decompose a high-level goal into concrete subtasks that specialist agents can execute.

Available agent types:
- "researcher": Searches the web, browses pages, gathers and synthesizes information. Tools: web_search, web_browse, file_ops.
- "coder": Writes, tests, and debugs code. Tools: code_execute, file_ops, shell_command, web_search.
- "analyst": Analyzes CSV/JSON data, finds patterns, generates insights. Tools: data_analyze, code_execute, file_ops.
- "writer": Creates written content — reports, articles, documentation. Tools: web_search, web_browse, file_ops.
- "general": Handles tasks that don't fit a specialist. Has access to all tools.

Rules:
1. Break the goal into 2-8 subtasks. Don't be too granular — each subtask should be a meaningful unit of work.
2. Assign the most appropriate agent type to each subtask.
3. Identify dependencies: if subtask B needs results from subtask A, list A's id in B's dependencies.
4. Group subtasks into execution layers: subtasks in the same layer can run in parallel (no dependencies between them).
5. Estimate complexity: "simple" (1-3 tool calls), "moderate" (4-10 tool calls), "complex" (10+ tool calls).
6. List which tools each subtask will likely need.
7. If any subtask might need human input, set requires_human_input to true.

Respond with ONLY valid JSON matching this exact schema:
{
  "goal": "the original goal",
  "subtasks": [
    {
      "id": "1",
      "title": "short title",
      "description": "detailed description of what this subtask should accomplish",
      "agent_type": "researcher|coder|analyst|writer|general",
      "dependencies": [],
      "estimated_complexity": "simple|moderate|complex",
      "tools_needed": ["tool_name1", "tool_name2"]
    }
  ],
  "execution_order": [["1", "2"], ["3"]],
  "estimated_total_steps": 15,
  "estimated_duration": "~3 minutes",
  "requires_human_input": false,
  "plan_reasoning": "brief explanation of why you structured the plan this way"
}"""


async def decompose_task(goal: str) -> TaskPlan:
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    response = await client.messages.create(
        model=settings.model_name,
        max_tokens=2048,
        system=PLANNING_PROMPT,
        messages=[{"role": "user", "content": f"Decompose this goal into subtasks:\n\n{goal}"}],
    )

    text = response.content[0].text.strip()

    # Extract JSON from potential markdown code blocks
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()

    plan_data = json.loads(text)

    subtasks = [SubTask(**st) for st in plan_data["subtasks"]]

    return TaskPlan(
        goal=plan_data.get("goal", goal),
        subtasks=subtasks,
        execution_order=plan_data.get("execution_order", [[st.id for st in subtasks]]),
        estimated_total_steps=plan_data.get("estimated_total_steps", len(subtasks) * 5),
        estimated_duration=plan_data.get("estimated_duration", f"~{len(subtasks) * 2} minutes"),
        requires_human_input=plan_data.get("requires_human_input", False),
        plan_reasoning=plan_data.get("plan_reasoning", ""),
    )
