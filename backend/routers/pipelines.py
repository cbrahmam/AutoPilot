import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.pipelines import (
    create_pipeline, list_pipelines, get_pipeline, update_pipeline,
    delete_pipeline, get_pipeline_runs, run_pipeline,
)

router = APIRouter()

_running_pipelines: dict[str, asyncio.Task] = {}


class PipelineStep(BaseModel):
    goal: str
    type: str = "sequential"
    condition: str = ""
    max_iterations: int = 25


class PipelineCreate(BaseModel):
    name: str
    description: str = ""
    steps: list[PipelineStep]


class PipelineUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    steps: list[PipelineStep] | None = None


@router.get("/pipelines")
async def list_all_pipelines():
    return await list_pipelines()


@router.post("/pipelines")
async def create_new_pipeline(body: PipelineCreate):
    steps = [s.model_dump() for s in body.steps]
    return await create_pipeline(body.name, body.description, steps)


@router.get("/pipelines/{pipeline_id}")
async def get_pipeline_detail(pipeline_id: str):
    pipeline = await get_pipeline(pipeline_id)
    if not pipeline:
        raise HTTPException(404, "Pipeline not found")
    return pipeline


@router.put("/pipelines/{pipeline_id}")
async def update_existing_pipeline(pipeline_id: str, body: PipelineUpdate):
    fields = {}
    if body.name is not None:
        fields["name"] = body.name
    if body.description is not None:
        fields["description"] = body.description
    if body.steps is not None:
        fields["steps"] = [s.model_dump() for s in body.steps]
    result = await update_pipeline(pipeline_id, **fields)
    if not result:
        raise HTTPException(404, "Pipeline not found")
    return result


@router.delete("/pipelines/{pipeline_id}")
async def delete_existing_pipeline(pipeline_id: str):
    await delete_pipeline(pipeline_id)
    return {"status": "deleted"}


@router.post("/pipelines/{pipeline_id}/run")
async def trigger_pipeline(pipeline_id: str):
    pipeline = await get_pipeline(pipeline_id)
    if not pipeline:
        raise HTTPException(404, "Pipeline not found")
    if pipeline.get("status") == "running":
        raise HTTPException(409, "Pipeline is already running")

    bg = asyncio.create_task(run_pipeline(pipeline_id))
    _running_pipelines[pipeline_id] = bg

    return {"status": "started", "pipeline_id": pipeline_id}


@router.get("/pipelines/{pipeline_id}/runs")
async def get_runs(pipeline_id: str):
    return await get_pipeline_runs(pipeline_id)
