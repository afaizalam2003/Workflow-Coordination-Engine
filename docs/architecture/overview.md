# Architecture (skeleton)

- **HTTP edge**: `apps/api` exposes booking intake and observability reads.
- **Workflow engine**: `services/workflow_engine` owns booking pipeline orchestration and Celery entry tasks.
- **Notification service**: `services/notification_service` owns async notification jobs (stub channel, real queue semantics).
- **Retry service**: `services/retry_service` hosts retry/DLQ observability hooks; pipeline retries are coordinated from the workflow engine with persisted `retries` rows.

See repository `README.md` for run instructions.
