import asyncio
import time
import json
from datetime import datetime, timezone
from typing import Callable, Optional

import anthropic

from config import settings
from models.schemas import TaskPlan, SubTask, SubTaskResult, TaskResult
from specialists.factory import create_specialist_agent


class PlanExecutor:
    def __init__(
        self,
        task_id: str,
        plan: TaskPlan,
        workspace_path: str,
        max_iterations: int = 25,
        require_approval: bool = False,
        emit: Optional[Callable] = None,
    ):
        self.task_id = task_id
        self.plan = plan
        self.workspace_path = workspace_path
        self.max_iterations = max_iterations
        self.require_approval = require_approval
        self._emit = emit

        self.subtask_results: dict[str, SubTaskResult] = {}
        self.active_agents: dict[str, object] = {}
        self._cancelled = False
        self._paused = asyncio.Event()
        self._paused.set()

    async def execute(self) -> TaskResult:
        start_time = time.perf_counter()

        await self._emit_event("plan_start", {
            "plan": self.plan.model_dump(),
            "total_subtasks": len(self.plan.subtasks),
        })

        subtask_map = {st.id: st for st in self.plan.subtasks}

        for layer_idx, layer in enumerate(self.plan.execution_order):
            if self._cancelled:
                break

            await self._paused.wait()

            await self._emit_event("layer_start", {
                "layer": layer_idx + 1,
                "total_layers": len(self.plan.execution_order),
                "subtask_ids": layer,
            })

            tasks = []
            for subtask_id in layer:
                if subtask_id not in subtask_map:
                    continue
                subtask = subtask_map[subtask_id]

                deps_ok = self._check_dependencies(subtask)
                if not deps_ok:
                    self.subtask_results[subtask_id] = SubTaskResult(
                        subtask_id=subtask_id,
                        agent_name=f"{subtask.agent_type}_{subtask_id}",
                        status="skipped",
                        output="Skipped: a dependency failed.",
                        error="Dependency failed",
                    )
                    continue

                tasks.append(self._run_subtask(subtask))

            if tasks:
                await asyncio.gather(*tasks)

            await self._emit_event("layer_complete", {
                "layer": layer_idx + 1,
                "results": {sid: r.status for sid, r in self.subtask_results.items()},
            })

        total_duration = int((time.perf_counter() - start_time) * 1000)

        final_output = await self._synthesize_results()

        all_files = []
        total_iterations = 0
        total_tokens = 0
        total_tool_calls = 0
        for r in self.subtask_results.values():
            all_files.extend(r.files_created)
            total_iterations += r.iterations_used
            total_tokens += r.tokens_used

        any_failed = any(r.status == "failed" for r in self.subtask_results.values())
        all_failed = all(r.status == "failed" for r in self.subtask_results.values())

        if all_failed:
            status = "failed"
        elif any_failed:
            status = "completed"
        else:
            status = "completed"

        result = TaskResult(
            task_id=self.task_id,
            status=status,
            plan=self.plan,
            subtask_results=list(self.subtask_results.values()),
            final_output=final_output,
            files_created=all_files,
            total_iterations=total_iterations,
            total_tokens=total_tokens,
            total_duration_ms=total_duration,
            total_tool_calls=total_tool_calls,
        )

        await self._emit_event("execution_complete", {
            "status": status,
            "total_duration_ms": total_duration,
            "subtasks_completed": sum(1 for r in self.subtask_results.values() if r.status == "completed"),
            "subtasks_failed": sum(1 for r in self.subtask_results.values() if r.status == "failed"),
        })

        return result

    async def _run_subtask(self, subtask: SubTask):
        start_time = time.perf_counter()

        await self._emit_event("agent_start", {
            "subtask_id": subtask.id,
            "title": subtask.title,
            "agent_type": subtask.agent_type,
        })

        context = self._build_context(subtask)

        agent = create_specialist_agent(
            agent_type=subtask.agent_type,
            task_id=self.task_id,
            subtask_id=subtask.id,
            max_iterations=self.max_iterations,
            require_approval=self.require_approval,
            emit=self._emit,
        )
        self.active_agents[subtask.id] = agent

        try:
            agent_result = await agent.run(
                task=subtask.description,
                context=context,
                workspace_path=self.workspace_path,
            )

            duration = int((time.perf_counter() - start_time) * 1000)

            self.subtask_results[subtask.id] = SubTaskResult(
                subtask_id=subtask.id,
                agent_name=agent.name,
                status="completed" if agent_result.success else "failed",
                output=agent_result.output,
                files_created=agent_result.files_created,
                iterations_used=agent_result.iterations_used,
                tokens_used=agent_result.tokens_used,
                duration_ms=duration,
                error=agent_result.error,
            )

        except Exception as e:
            duration = int((time.perf_counter() - start_time) * 1000)
            self.subtask_results[subtask.id] = SubTaskResult(
                subtask_id=subtask.id,
                agent_name=agent.name,
                status="failed",
                output="",
                duration_ms=duration,
                error=str(e),
            )

        finally:
            self.active_agents.pop(subtask.id, None)

        await self._emit_event("agent_complete", {
            "subtask_id": subtask.id,
            "agent_name": agent.name,
            "status": self.subtask_results[subtask.id].status,
            "duration_ms": self.subtask_results[subtask.id].duration_ms,
        })

    def _check_dependencies(self, subtask: SubTask) -> bool:
        for dep_id in subtask.dependencies:
            dep_result = self.subtask_results.get(dep_id)
            if not dep_result or dep_result.status == "failed":
                return False
        return True

    def _build_context(self, subtask: SubTask) -> dict | None:
        if not subtask.dependencies:
            return None

        context = {}
        for dep_id in subtask.dependencies:
            dep_result = self.subtask_results.get(dep_id)
            if dep_result and dep_result.status == "completed":
                dep_subtask = next(
                    (st for st in self.plan.subtasks if st.id == dep_id), None
                )
                title = dep_subtask.title if dep_subtask else dep_id
                summary = dep_result.output[:2000]
                files = ", ".join(dep_result.files_created) if dep_result.files_created else "none"
                context[f"completed_{dep_id}"] = (
                    f"Previous agent [{dep_result.agent_name}] completed '{title}'. "
                    f"Key output: {summary}. Files created: {files}."
                )
        return context if context else None

    async def _synthesize_results(self) -> str:
        completed = [r for r in self.subtask_results.values() if r.status == "completed"]
        if not completed:
            return "No subtasks completed successfully."

        if len(completed) == 1:
            return completed[0].output

        summaries = []
        for r in completed:
            subtask = next((st for st in self.plan.subtasks if st.id == r.subtask_id), None)
            title = subtask.title if subtask else r.subtask_id
            summaries.append(f"## {title}\n{r.output}")

        combined = "\n\n---\n\n".join(summaries)

        try:
            client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
            response = await client.messages.create(
                model=settings.model_name,
                max_tokens=4096,
                system=(
                    "You are a synthesis agent. Combine the outputs from multiple specialist agents "
                    "into a single, cohesive, well-organized final result. Preserve key details, "
                    "data, and findings. Remove redundancy. Use clear structure with headings."
                ),
                messages=[{
                    "role": "user",
                    "content": (
                        f"The goal was: {self.plan.goal}\n\n"
                        f"Here are the outputs from each agent:\n\n{combined}\n\n"
                        "Synthesize these into a single, cohesive result."
                    ),
                }],
            )
            return response.content[0].text
        except Exception:
            return combined

    async def _emit_event(self, event_type: str, data: dict):
        if self._emit:
            await self._emit({
                "type": event_type,
                "agent_name": "executor",
                "task_id": self.task_id,
                "data": data,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

    def pause(self):
        self._paused.clear()
        for agent in self.active_agents.values():
            if hasattr(agent, "pause"):
                agent.pause()

    def resume(self):
        self._paused.set()
        for agent in self.active_agents.values():
            if hasattr(agent, "resume"):
                agent.resume()

    def cancel(self):
        self._cancelled = True
        self._paused.set()
        for agent in self.active_agents.values():
            if hasattr(agent, "cancel"):
                agent.cancel()
