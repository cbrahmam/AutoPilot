import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException

from config import settings
from database import get_db
from models.db_models import create_task, get_task
from models.schemas import TaskPlan, SubTask

router = APIRouter()

TEMPLATES = {
    "competitive_research": {
        "id": "competitive_research",
        "name": "Competitive Research Report",
        "description": "Research a company/product and its top 3 competitors. Create a comparison report.",
        "category": "research",
        "prompt_template": "Research {topic} and its top 3 competitors. Create a detailed comparison report covering features, pricing, strengths, and weaknesses.",
        "variables": [{"name": "topic", "label": "Company or Product", "placeholder": "e.g. Notion, Slack, Stripe"}],
        "plan": {
            "subtasks": [
                {"id": "s1", "title": "Research primary company", "description": "Search for and gather detailed information about the target company/product including features, pricing, market position, and recent developments.", "agent_type": "researcher", "dependencies": [], "estimated_complexity": "moderate", "tools_needed": ["web_search", "web_browse", "file_ops"]},
                {"id": "s2", "title": "Research competitors", "description": "Identify and research the top 3 competitors, gathering comparable information about each.", "agent_type": "researcher", "dependencies": [], "estimated_complexity": "moderate", "tools_needed": ["web_search", "web_browse", "file_ops"]},
                {"id": "s3", "title": "Write comparison report", "description": "Synthesize research into a structured comparison report with tables, pros/cons, and recommendations.", "agent_type": "writer", "dependencies": ["s1", "s2"], "estimated_complexity": "moderate", "tools_needed": ["file_ops"]},
            ],
            "execution_order": [["s1", "s2"], ["s3"]],
        },
    },
    "data_pipeline": {
        "id": "data_pipeline",
        "name": "Build a Data Pipeline Script",
        "description": "Write a Python script that reads, transforms, and outputs data.",
        "category": "coding",
        "prompt_template": "Write a Python script that {task_description}. Include error handling, logging, and a README with usage instructions.",
        "variables": [{"name": "task_description", "label": "What the script should do", "placeholder": "e.g. reads a CSV, cleans the data, and exports to JSON"}],
        "plan": {
            "subtasks": [
                {"id": "s1", "title": "Write the script", "description": "Write a well-structured Python script implementing the requested data pipeline with proper error handling and logging.", "agent_type": "coder", "dependencies": [], "estimated_complexity": "moderate", "tools_needed": ["code_execute", "file_ops", "shell_command"]},
                {"id": "s2", "title": "Test the script", "description": "Create test data, run the script, verify outputs, and fix any issues found.", "agent_type": "coder", "dependencies": ["s1"], "estimated_complexity": "simple", "tools_needed": ["code_execute", "file_ops", "shell_command"]},
                {"id": "s3", "title": "Write documentation", "description": "Write a README.md with installation instructions, usage examples, and API documentation.", "agent_type": "writer", "dependencies": ["s1", "s2"], "estimated_complexity": "simple", "tools_needed": ["file_ops"]},
            ],
            "execution_order": [["s1"], ["s2"], ["s3"]],
        },
    },
    "csv_analysis": {
        "id": "csv_analysis",
        "name": "Analyze CSV and Generate Report",
        "description": "Analyze an uploaded CSV and create an insights report.",
        "category": "analysis",
        "prompt_template": "Analyze the CSV data in the workspace. Focus on: {focus_areas}. Create a report with key insights, statistics, and visualizations.",
        "variables": [{"name": "focus_areas", "label": "Focus areas", "placeholder": "e.g. trends over time, top performers, anomalies"}],
        "plan": {
            "subtasks": [
                {"id": "s1", "title": "Analyze data", "description": "Load the CSV, perform statistical analysis including distributions, correlations, and trends. Generate summary statistics and identify key patterns.", "agent_type": "analyst", "dependencies": [], "estimated_complexity": "moderate", "tools_needed": ["data_analyze", "code_execute", "file_ops"]},
                {"id": "s2", "title": "Write insights report", "description": "Create a well-structured report with findings, charts descriptions, and actionable recommendations based on the analysis.", "agent_type": "writer", "dependencies": ["s1"], "estimated_complexity": "moderate", "tools_needed": ["file_ops"]},
            ],
            "execution_order": [["s1"], ["s2"]],
        },
    },
    "blog_post": {
        "id": "blog_post",
        "name": "Technical Blog Post",
        "description": "Research and write a technical blog post about a topic.",
        "category": "writing",
        "prompt_template": "Research and write a technical blog post about {topic}. Include code examples, diagrams descriptions, and practical advice.",
        "variables": [{"name": "topic", "label": "Topic", "placeholder": "e.g. RAG pipelines, WebSocket best practices"}],
        "plan": {
            "subtasks": [
                {"id": "s1", "title": "Research topic", "description": "Research the topic thoroughly: key concepts, current best practices, notable implementations, and common pitfalls.", "agent_type": "researcher", "dependencies": [], "estimated_complexity": "moderate", "tools_needed": ["web_search", "web_browse", "file_ops"]},
                {"id": "s2", "title": "Write draft", "description": "Write a comprehensive blog post with an engaging introduction, well-structured sections, code examples, and a conclusion.", "agent_type": "writer", "dependencies": ["s1"], "estimated_complexity": "moderate", "tools_needed": ["file_ops"]},
                {"id": "s3", "title": "Review and polish", "description": "Review the draft for accuracy, clarity, and engagement. Add missing details, fix errors, improve flow, and finalize.", "agent_type": "writer", "dependencies": ["s2"], "estimated_complexity": "simple", "tools_needed": ["file_ops"]},
            ],
            "execution_order": [["s1"], ["s2"], ["s3"]],
        },
    },
    "market_research": {
        "id": "market_research",
        "name": "Market Research",
        "description": "Research an industry market, key players, trends, and opportunities.",
        "category": "research",
        "prompt_template": "Research the {industry} market comprehensively. Cover market size, key players, trends, opportunities, and challenges.",
        "variables": [{"name": "industry", "label": "Industry", "placeholder": "e.g. AI SaaS, electric vehicles, fintech"}],
        "plan": {
            "subtasks": [
                {"id": "s1", "title": "Industry overview", "description": "Research the overall market: size, growth rate, segments, and geographic distribution.", "agent_type": "researcher", "dependencies": [], "estimated_complexity": "moderate", "tools_needed": ["web_search", "web_browse", "file_ops"]},
                {"id": "s2", "title": "Key players analysis", "description": "Identify and profile the top companies in the market including market share, products, and strategies.", "agent_type": "researcher", "dependencies": [], "estimated_complexity": "moderate", "tools_needed": ["web_search", "web_browse", "file_ops"]},
                {"id": "s3", "title": "Trends and opportunities", "description": "Research emerging trends, technological developments, regulatory changes, and growth opportunities.", "agent_type": "researcher", "dependencies": [], "estimated_complexity": "moderate", "tools_needed": ["web_search", "web_browse", "file_ops"]},
                {"id": "s4", "title": "Synthesize report", "description": "Combine all research into a comprehensive market report with executive summary, detailed sections, and strategic recommendations.", "agent_type": "writer", "dependencies": ["s1", "s2", "s3"], "estimated_complexity": "moderate", "tools_needed": ["file_ops"]},
            ],
            "execution_order": [["s1", "s2", "s3"], ["s4"]],
        },
    },
}


@router.get("/templates")
async def list_templates():
    return [
        {
            "id": t["id"],
            "name": t["name"],
            "description": t["description"],
            "category": t["category"],
            "variables": t["variables"],
        }
        for t in TEMPLATES.values()
    ]


@router.post("/templates/{template_id}/use")
async def use_template(template_id: str, body: dict):
    template = TEMPLATES.get(template_id)
    if not template:
        raise HTTPException(404, "Template not found")

    goal = template["prompt_template"]
    for var in template["variables"]:
        value = body.get(var["name"], f"[{var['label']}]")
        goal = goal.replace(f"{{{var['name']}}}", value)

    task_id = uuid.uuid4().hex
    workspace_path = str(settings.workspaces_dir / task_id)
    Path(workspace_path).mkdir(parents=True, exist_ok=True)

    plan_data = template["plan"]
    subtasks = [SubTask(**st) for st in plan_data["subtasks"]]
    plan = TaskPlan(
        goal=goal,
        subtasks=subtasks,
        execution_order=plan_data["execution_order"],
        estimated_total_steps=len(subtasks),
        plan_reasoning=f"Pre-built plan from template: {template['name']}",
    )

    async with get_db() as db:
        await create_task(db, goal, False, 25, workspace_path, task_id=task_id)
        from models.db_models import update_task
        await update_task(db, task_id, plan=plan.model_dump_json())
        task = await get_task(db, task_id)

    return {
        "id": task_id,
        "goal": goal,
        "status": task["status"],
        "plan": plan.model_dump(),
    }
