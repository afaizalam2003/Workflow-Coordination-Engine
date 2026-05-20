from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from apps.api.db.models import Event, Workflow
from apps.api.db.session import get_db
from apps.api.schemas import EventOut, WorkflowDetail, WorkflowSummary

router = APIRouter()


@router.get("", response_model=list[WorkflowSummary])
def list_workflows(limit: int = 50, db: Session = Depends(get_db)) -> list[WorkflowSummary]:
    rows = db.execute(select(Workflow).order_by(Workflow.created_at.desc()).limit(limit)).scalars().all()
    return [WorkflowSummary.model_validate(r) for r in rows]


@router.get("/{workflow_id}", response_model=WorkflowDetail)
def get_workflow(workflow_id: UUID, db: Session = Depends(get_db)) -> WorkflowDetail:
    wf = db.get(Workflow, workflow_id)
    if not wf:
        raise HTTPException(status_code=404, detail="workflow not found")
    events = (
        db.execute(select(Event).where(Event.workflow_id == wf.id).order_by(Event.created_at))
        .scalars()
        .all()
    )
    return WorkflowDetail(
        id=wf.id,
        workflow_type=wf.workflow_type,
        status=wf.status,
        retry_count=wf.retry_count,
        created_at=wf.created_at,
        updated_at=wf.updated_at,
        payload=wf.payload,
        last_error=wf.last_error,
        events=[
            EventOut(
                id=e.id,
                event_type=e.event_type,
                status=e.status,
                retry_count=e.retry_count,
                processed_at=e.processed_at,
                created_at=e.created_at,
            )
            for e in events
        ],
    )
