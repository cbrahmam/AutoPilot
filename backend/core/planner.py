"""Task decomposition and planning. Full implementation in Block 2."""


async def decompose_task(goal: str) -> dict:
    return {
        "goal": goal,
        "subtasks": [{"id": "1", "title": goal, "agent_type": "general", "dependencies": []}],
        "execution_order": [["1"]],
    }
