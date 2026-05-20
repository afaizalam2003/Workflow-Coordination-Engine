from datetime import UTC, datetime
from uuid import UUID

import structlog
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from apps.api.db.models import AuditLog, Event, EventStatus, Retry, RetryStatus, Workflow, WorkflowStatus

log = structlog.get_logger(__name__)


def append_audit(
    db: Session,
    *,
    workflow_id: UUID | None,
    action: str,
    metadata: dict | None = None,
) -> None:
    row = AuditLog(workflow_id=workflow_id, action=action, metadata_=metadata or {})
    db.add(row)


def transition_workflow(
    db: Session,
    workflow: Workflow,
    new_status: WorkflowStatus,
    *,
    error: str | None = None,
) -> None:
    old = workflow.status
    workflow.status = new_status
    if error:
        workflow.last_error = error
    db.flush()
    append_audit(
        db,
        workflow_id=workflow.id,
        action="workflow.status_changed",
        metadata={"from": old, "to": new_status, "error": error},
    )
    log.info(
        "workflow_status_changed",
        workflow_id=str(workflow.id),
        from_status=old,
        to_status=new_status,
    )


def create_event(
    db: Session,
    *,
    workflow_id: UUID,
    event_type: str,
    payload: dict | None = None,
    metadata: dict | None = None,
    status: EventStatus = EventStatus.PENDING,
) -> Event:
    ev = Event(
        workflow_id=workflow_id,
        event_type=event_type,
        status=status,
        payload=payload,
        metadata_=metadata,
    )
    db.add(ev)
    db.flush()
    append_audit(
        db,
        workflow_id=workflow_id,
        action="event.created",
        metadata={"event_id": str(ev.id), "event_type": event_type, "status": status.value},
    )
    log.info("event_created", workflow_id=str(workflow_id), event_type=event_type, event_id=str(ev.id))
    return ev


def mark_event_status(db: Session, event: Event, status: EventStatus) -> None:
    event.status = status
    db.flush()
    append_audit(
        db,
        workflow_id=event.workflow_id,
        action="event.status_changed",
        metadata={"event_id": str(event.id), "event_type": event.event_type, "status": status.value},
    )


def record_retry_schedule(
    db: Session,
    *,
    event: Event,
    retry_number: int,
    scheduled_for,
    error_message: str | None,
) -> Retry:
    row = Retry(
        event_id=event.id,
        retry_number=retry_number,
        scheduled_for=scheduled_for,
        status=RetryStatus.SCHEDULED,
        error_message=error_message,
    )
    db.add(row)
    db.flush()
    append_audit(
        db,
        workflow_id=event.workflow_id,
        action="retry.scheduled",
        metadata={
            "event_id": str(event.id),
            "retry_number": retry_number,
            "scheduled_for": scheduled_for.isoformat(),
        },
    )
    log.warning(
        "retry_scheduled",
        workflow_id=str(event.workflow_id),
        event_id=str(event.id),
        retry_number=retry_number,
    )
    return row


def mark_dead_letter(db: Session, workflow: Workflow, event: Event | None, reason: str) -> None:
    transition_workflow(db, workflow, WorkflowStatus.FAILED, error=reason)
    if event:
        mark_event_status(db, event, EventStatus.FAILED)
        r = Retry(
            event_id=event.id,
            retry_number=event.retry_count,
            scheduled_for=datetime.now(UTC),
            status=RetryStatus.DEAD_LETTER,
            error_message=reason,
        )
        db.add(r)
        db.flush()
    append_audit(
        db,
        workflow_id=workflow.id,
        action="workflow.dead_lettered",
        metadata={"reason": reason, "event_id": str(event.id) if event else None},
    )
    log.error("dead_letter", workflow_id=str(workflow.id), reason=reason)


def observability_snapshot(db: Session) -> dict:
    rows = db.execute(select(Workflow.status, func.count()).group_by(Workflow.status)).all()
    status_counts: dict[str, int] = {}
    for st, cnt in rows:
        key = st.value if isinstance(st, WorkflowStatus) else str(st)
        status_counts[key] = int(cnt)
    failed = int(status_counts.get(WorkflowStatus.FAILED.value, 0))
    total_retries = db.scalar(select(func.count()).select_from(Retry)) or 0
    pending_retries = db.scalar(
        select(func.count()).select_from(Retry).where(Retry.status == RetryStatus.SCHEDULED)
    ) or 0
    dlq = db.scalar(
        select(func.count()).select_from(Retry).where(Retry.status == RetryStatus.DEAD_LETTER)
    ) or 0
    recent_failed = (
        db.execute(
            select(Workflow)
            .where(Workflow.status == WorkflowStatus.FAILED)
            .order_by(Workflow.updated_at.desc())
            .limit(10)
        )
        .scalars()
        .all()
    )
    return {
        "workflows_by_status": status_counts,
        "failed_workflows": failed,
        "total_retries_rows": total_retries,
        "pending_retries": pending_retries,
        "dead_letter_retries": dlq,
        "recent_failed_workflows": recent_failed,
    }
