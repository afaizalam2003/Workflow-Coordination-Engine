# Decisions

| Topic | Decision |
|-------|----------|
| Monorepo Python layout | Single installable package with `apps.*` and `services.*` to keep Celery imports simple in containers. |
| DB access | Synchronous SQLAlchemy sessions shared by FastAPI routes and Celery workers for a smaller first iteration. |
| Notification coupling | Celery `chain` from booking pipeline into `notification.send_booking`, then resume pipeline for downstream steps. |
