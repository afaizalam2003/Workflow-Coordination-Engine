import structlog

from apps.api.celery_app import celery_app

log = structlog.get_logger(__name__)


@celery_app.task(name="retry.observe_queue_depth")
def observe_queue_depth(queue_name: str = "celery") -> dict[str, str]:
    """Placeholder hook for retry/DLQ metrics exporters."""
    log.debug("retry_queue_observed", queue=queue_name)
    return {"queue": queue_name, "status": "ok"}
