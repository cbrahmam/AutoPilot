from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime, timezone
from enum import Enum


class TaskStatus(str, Enum):
    PENDING = "pending"
    PLANNING = "planning"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"


class AgentStatus(str, Enum):
    IDLE = "idle"
    THINKING = "thinking"
    ACTING = "acting"
    WAITING_APPROVAL = "waiting_approval"
    COMPLETED = "completed"
    FAILED = "failed"


class ActionType(str, Enum):
    THINK = "think"
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"
    FINAL_ANSWER = "final_answer"
    ERROR = "error"


class MemoryType(str, Enum):
    FACT = "fact"
    DECISION = "decision"
    OBSERVATION = "observation"
    FILE_CREATED = "file_created"


class TaskCreate(BaseModel):
    goal: str
    require_approval: bool = False
    max_iterations: int = 25


class HumanResponse(BaseModel):
    request_id: str
    approved: bool
    response: Optional[str] = None


class TaskResponse(BaseModel):
    id: str
    goal: str
    status: str
    plan: Optional[str] = None
    result: Optional[str] = None
    workspace_path: Optional[str] = None
    created_at: Optional[str] = None
    completed_at: Optional[str] = None
    total_iterations: int = 0
    total_tokens: int = 0
    total_tool_calls: int = 0


class AgentLogResponse(BaseModel):
    id: str
    task_id: str
    agent_name: str
    iteration: int
    action_type: str
    content: str
    tool_name: Optional[str] = None
    tokens_used: int = 0
    duration_ms: int = 0
    timestamp: str


class ToolResultSchema(BaseModel):
    success: bool
    output: str
    data: Optional[Any] = None
    error: Optional[str] = None
    execution_time_ms: int = 0


class AgentResult(BaseModel):
    success: bool
    output: str
    iterations_used: int
    tool_calls_made: int
    tokens_used: int
    files_created: list[str] = []
    max_iterations_reached: bool = False
    error: Optional[str] = None


class SubTask(BaseModel):
    id: str
    title: str
    description: str
    agent_type: str
    dependencies: list[str] = []
    estimated_complexity: str = "moderate"
    tools_needed: list[str] = []


class TaskPlan(BaseModel):
    goal: str
    subtasks: list[SubTask]
    execution_order: list[list[str]]
    estimated_total_steps: int = 0
    estimated_duration: str = ""
    requires_human_input: bool = False
    plan_reasoning: str = ""


class SubTaskResult(BaseModel):
    subtask_id: str
    agent_name: str
    status: str
    output: str
    files_created: list[str] = []
    iterations_used: int = 0
    tokens_used: int = 0
    duration_ms: int = 0
    error: Optional[str] = None


class TaskResult(BaseModel):
    task_id: str
    status: str
    plan: TaskPlan
    subtask_results: list[SubTaskResult]
    final_output: str
    files_created: list[str] = []
    total_iterations: int = 0
    total_tokens: int = 0
    total_duration_ms: int = 0
    total_tool_calls: int = 0


class PlanUpdate(BaseModel):
    subtasks: Optional[list[SubTask]] = None
    execution_order: Optional[list[list[str]]] = None


class WSEvent(BaseModel):
    type: str
    agent_name: str = ""
    task_id: str = ""
    data: dict = {}
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
