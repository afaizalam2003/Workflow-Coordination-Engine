from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from apps.api.db.models import EventStatus, WorkflowStatus


class DocumentIntelligencePipelineCreate(BaseModel):
    document_url: str = Field(min_length=5, max_length=1000)
    priority: str = Field(default="normal")
    callback_url: str | None = Field(default=None)


class WorkflowResponse(BaseModel):
    workflow_id: UUID
    status: WorkflowStatus
    idempotent_hit: bool = False


class WorkflowSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workflow_type: str
    status: WorkflowStatus
    retry_count: int
    created_at: datetime
    updated_at: datetime


class EventOut(BaseModel):
    id: UUID
    event_type: str
    status: EventStatus
    retry_count: int
    processed_at: datetime | None
    created_at: datetime


class WorkflowDetail(WorkflowSummary):
    payload: dict[str, Any]
    last_error: str | None
    events: list[EventOut]


class ObservabilityOverview(BaseModel):
    workflows_by_status: dict[str, int]
    failed_workflows: int
    total_retries_rows: int
    pending_retries: int
    dead_letter_retries: int
    recent_failed_workflows: list[WorkflowSummary]
