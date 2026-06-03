from config import settings

MODEL_TIERS = {
    "haiku": {
        "model": "claude-haiku-4-5-20251001",
        "cost_per_m_input": 0.80,
        "cost_per_m_output": 4.00,
        "max_tokens": 4096,
        "best_for": ["simple", "formatting", "extraction"],
    },
    "sonnet": {
        "model": "claude-sonnet-4-20250514",
        "cost_per_m_input": 3.00,
        "cost_per_m_output": 15.00,
        "max_tokens": 4096,
        "best_for": ["moderate", "coding", "analysis", "research"],
    },
    "opus": {
        "model": "claude-opus-4-20250514",
        "cost_per_m_input": 15.00,
        "cost_per_m_output": 75.00,
        "max_tokens": 4096,
        "best_for": ["complex", "planning", "synthesis", "creative"],
    },
}

COMPLEXITY_TO_TIER = {
    "simple": "haiku",
    "moderate": "sonnet",
    "complex": "opus",
}

AGENT_TYPE_WEIGHTS = {
    "researcher": 0,
    "coder": 1,
    "analyst": 0,
    "writer": -1,
    "general": 0,
}

TIERS_ORDERED = ["haiku", "sonnet", "opus"]


def select_model(
    complexity: str = "moderate",
    agent_type: str = "general",
    tool_count: int = 0,
    auto_route: bool = True,
) -> str:
    if not auto_route:
        return settings.model_name

    base_tier = COMPLEXITY_TO_TIER.get(complexity, "sonnet")
    base_idx = TIERS_ORDERED.index(base_tier)

    weight = AGENT_TYPE_WEIGHTS.get(agent_type, 0)
    if tool_count >= 5:
        weight += 1

    final_idx = max(0, min(len(TIERS_ORDERED) - 1, base_idx + weight))
    tier = TIERS_ORDERED[final_idx]

    return MODEL_TIERS[tier]["model"]


def get_model_info(model_name: str) -> dict:
    for tier_name, tier in MODEL_TIERS.items():
        if tier["model"] == model_name:
            return {"tier": tier_name, **tier}
    return {"tier": "custom", "model": model_name}


def estimate_cost(input_tokens: int, output_tokens: int, model_name: str) -> float:
    info = get_model_info(model_name)
    input_cost = (input_tokens / 1_000_000) * info.get("cost_per_m_input", 3.0)
    output_cost = (output_tokens / 1_000_000) * info.get("cost_per_m_output", 15.0)
    return round(input_cost + output_cost, 6)
