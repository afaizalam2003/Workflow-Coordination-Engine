from datetime import UTC, datetime
from uuid import UUID

import structlog

from apps.api.celery_app import celery_app
from apps.api.db.models import Event, EventStatus
from apps.api.db.session import SessionLocal
from apps.api.services import workflow_repository as wf_repo

log = structlog.get_logger(__name__)


@celery_app.task(name="notification.send_booking", bind=True, max_retries=3, default_retry_delay=10)
def send_booking_notification(self, event_id: str) -> dict:
    db = SessionLocal()
    try:
        ev = db.get(Event, UUID(event_id))
        if not ev:
            return {"status": "missing_event", "event_id": event_id}
        wf_repo.mark_event_status(db, ev, EventStatus.PROCESSING)
        db.flush()
        # Stub channel — real system would call email/Slack provider.
        payload = ev.payload or {}
        log.info(
            "notification_dispatch_stub",
            event_id=event_id,
            workflow_id=str(ev.workflow_id),
            template=payload.get("template"),
        )
        ev.processed_at = datetime.now(UTC)
        wf_repo.mark_event_status(db, ev, EventStatus.COMPLETED)
        db.commit()
        return {"status": "sent", "event_id": event_id, "workflow_id": str(ev.workflow_id)}
    except Exception as exc:
        db.rollback()
        log.exception("notification_failed", event_id=event_id)
        raise self.retry(exc=exc) from exc
    finally:
        db.close()
