from uuid import UUID, uuid4

import structlog
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from apps.api.db.models import Event, EventStatus, Workflow, WorkflowStatus
from apps.api.db.session import get_db
from apps.api.schemas import DocumentIntelligencePipelineCreate, WorkflowResponse
from apps.api.services import workflow_repository as wf_repo
from services.workflow_engine.tasks import process_document_pipeline

router = APIRouter()
log = structlog.get_logger(__name__)


@router.post("", status_code=status.HTTP_202_ACCEPTED)
def create_document_pipeline(
    body: DocumentIntelligencePipelineCreate,
    db: Session = Depends(get_db),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> WorkflowResponse:
    if idempotency_key:
        existing = db.execute(
            select(Workflow).where(Workflow.idempotency_key == idempotency_key)
        ).scalar_one_or_none()
        if existing:
            log.info("document_pipeline_idempotent_hit", workflow_id=str(existing.id))
            return WorkflowResponse(
                workflow_id=existing.id, status=existing.status, idempotent_hit=True
            )

    wf = Workflow(
        workflow_type="document_intelligence_pipeline",
        status=WorkflowStatus.PENDING,
        payload={
            "document_url": body.document_url,
            "priority": body.priority,
            "callback_url": body.callback_url,
        },
        idempotency_key=idempotency_key or str(uuid4()),
    )
    db.add(wf)
    db.flush()

    wf_repo.append_audit(
        db,
        workflow_id=wf.id,
        action="document.received",
        metadata={"document_url": body.document_url},
    )
    ev = wf_repo.create_event(
        db,
        workflow_id=wf.id,
        event_type="document.received",
        payload={"document_url": body.document_url, "priority": body.priority},
        status=EventStatus.PENDING,
    )
    db.commit()

    process_document_pipeline.delay(str(wf.id), str(ev.id))
    log.info("document_pipeline_enqueued", workflow_id=str(wf.id), event_id=str(ev.id))
    return WorkflowResponse(workflow_id=wf.id, status=wf.status, idempotent_hit=False)


@router.get("/{workflow_id}", response_model=None)
def get_document_workflow(workflow_id: UUID, db: Session = Depends(get_db)):
    wf = db.get(Workflow, workflow_id)
    if not wf or wf.workflow_type != "document_intelligence_pipeline":
        raise HTTPException(status_code=404, detail="workflow not found")
    events = (
        db.execute(select(Event).where(Event.workflow_id == wf.id).order_by(Event.created_at))
        .scalars()
        .all()
    )
    return {
        "workflow": {
            "id": str(wf.id),
            "status": wf.status.value if hasattr(wf.status, "value") else wf.status,
            "retry_count": wf.retry_count,
            "payload": wf.payload,
        },
        "events": [
            {
                "id": str(e.id),
                "type": e.event_type,
                "status": e.status.value if hasattr(e.status, "value") else e.status,
                "retry_count": e.retry_count,
            }
            for e in events
        ],
    }
