from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from redis import Redis

from apps.api.config import get_settings
from apps.api.db.models import AuditLog, Retry, RetryStatus, Workflow, WorkflowStatus
from apps.api.db.session import get_db
from apps.api.schemas import ObservabilityOverview, WorkflowSummary
from apps.api.services import workflow_repository as wf_repo

router = APIRouter()


@router.get("/queues")
def queue_snapshot() -> dict:
    settings = get_settings()
    client = Redis.from_url(settings.redis_url, decode_responses=True, ssl_cert_reqs=None)
    try:
        default_len = int(client.llen("celery"))
    except Exception:
        return {"celery_default": None, "note": "redis unavailable or key missing"}
    return {"celery_default": default_len}


@router.get("/overview", response_model=ObservabilityOverview)
def overview(db: Session = Depends(get_db)) -> ObservabilityOverview:
    snap = wf_repo.observability_snapshot(db)
    recent = snap["recent_failed_workflows"]
    return ObservabilityOverview(
        workflows_by_status=snap["workflows_by_status"],
        failed_workflows=snap["failed_workflows"],
        total_retries_rows=snap["total_retries_rows"],
        pending_retries=snap["pending_retries"],
        dead_letter_retries=snap["dead_letter_retries"],
        recent_failed_workflows=[
            WorkflowSummary(
                id=w.id,
                workflow_type=w.workflow_type,
                status=w.status,
                retry_count=w.retry_count,
                created_at=w.created_at,
                updated_at=w.updated_at,
            )
            for w in recent
        ],
    )


@router.get("/audit")
def audit_logs(limit: int = Query(default=50, le=200), db: Session = Depends(get_db)) -> list[dict]:
    rows = (
        db.execute(select(AuditLog).order_by(desc(AuditLog.timestamp)).limit(limit))
        .scalars()
        .all()
    )
    return [
        {
            "id": str(r.id),
            "workflow_id": str(r.workflow_id) if r.workflow_id else None,
            "action": r.action,
            "metadata": r.metadata_ or {},
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
        }
        for r in rows
    ]


@router.get("/failures")
def failures(db: Session = Depends(get_db)) -> dict:
    # Dead letter workflows
    dead_letter_wf = (
        db.execute(
            select(Workflow)
            .where(Workflow.status == WorkflowStatus.FAILED)
            .order_by(desc(Workflow.updated_at))
            .limit(20)
        )
        .scalars()
        .all()
    )
    # Active retries
    active_retries = (
        db.execute(
            select(Retry)
            .where(Retry.status == RetryStatus.SCHEDULED)
            .order_by(desc(Retry.created_at))
            .limit(20)
        )
        .scalars()
        .all()
    )
    return {
        "dead_letter": [
            {
                "id": str(w.id),
                "workflow_type": w.workflow_type,
                "last_error": w.last_error,
                "retry_count": w.retry_count,
                "updated_at": w.updated_at.isoformat() if w.updated_at else None,
            }
            for w in dead_letter_wf
        ],
        "active_retries": [
            {
                "id": str(r.id),
                "event_id": str(r.event_id),
                "retry_number": r.retry_number,
                "scheduled_for": r.scheduled_for.isoformat() if r.scheduled_for else None,
                "error_message": r.error_message,
                "status": r.status,
            }
            for r in active_retries
        ],
    }

