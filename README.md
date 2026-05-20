# ⚙️ Workflow Coordination Engine

> Centralized orchestration for operational workflows — events, queues, retries, audit trails, and real-time observability.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Celery](https://img.shields.io/badge/Celery-5.x-37814A?style=flat-square&logo=celery)](https://docs.celeryq.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=flat-square&logo=postgresql)](https://neon.tech)
[![Redis](https://img.shields.io/badge/Redis-Upstash-DC382D?style=flat-square&logo=redis)](https://upstash.com)

This repository targets **systems behavior** — reliability, recovery, and observability — not a productized CRUD app.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js Ops Dashboard                        │
│              (Real-time monitoring & control plane)              │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP / REST
┌───────────────────────────▼─────────────────────────────────────┐
│                       FastAPI Gateway                            │
│          (Auth, routing, idempotency, audit logging)             │
└────────────┬──────────────────────────────┬────────────────────-┘
             │ Celery tasks                 │ SQLAlchemy (async)
┌────────────▼─────────────┐   ┌───────────▼──────────────────────┐
│     Celery Workers        │   │    PostgreSQL (Neon)              │
│  ┌─────────────────────┐  │   │  ┌────────────────────────────┐  │
│  │  workflow_engine     │  │   │  │ workflows, events, audit   │  │
│  │  notification_svc    │  │   │  └────────────────────────────┘  │
│  │  retry_service       │  │   └──────────────────────────────────┘
│  └─────────────────────┘  │
└────────────┬──────────────┘
             │
┌────────────▼─────────────┐
│    Redis / Upstash        │
│  (Broker + Result Store)  │
└──────────────────────────┘
```

## 📁 Repository Layout

| Path | Role |
|------|------|
| `apps/api` | FastAPI gateway, HTTP API, Celery app entrypoint |
| `apps/web` | Next.js Ops Dashboard (real-time monitoring) |
| `services/workflow_engine` | Booking pipeline orchestration, state transitions |
| `services/notification_service` | Async notification jobs |
| `services/retry_service` | Retry scheduling and dead-letter signaling |
| `infrastructure/docker` | Container build assets |
| `alembic/` | Database migration scripts |

---

## 🚀 Quick Start (Docker)

```bash
cp .env.example .env
# Edit .env with your DB / Redis credentials
docker compose up --build
```

| Endpoint | URL |
|----------|-----|
| API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |
| Health Check | http://localhost:8000/health |
| Overview | http://localhost:8000/observability/overview |
| Queues | http://localhost:8000/observability/queues |
| Next.js UI | http://localhost:3000 |

---

## 🛠️ Local Development

```bash
# 1. Clone & enter repo
git clone https://github.com/YOUR_USERNAME/workflow-coordination-engine.git
cd workflow-coordination-engine

# 2. Python environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux/Mac

# 3. Install dependencies
pip install -e ".[dev]"

# 4. Configure environment
cp .env.example .env
# Edit .env with real credentials

# 5. Run migrations
alembic upgrade head

# 6. Start API
uvicorn apps.api.main:app --reload

# 7. Start Celery worker (separate terminal)
celery -A apps.api.celery_app worker -l info -P solo

# 8. Start Next.js frontend (separate terminal)
cd apps/web && npm install && npm run dev
```

---

## 🔄 Primary Flow

1. `POST /document-intelligence` creates a `document_intelligence_pipeline` workflow, a `document.received` event, audit rows, and enqueues `workflow_engine.process_document_pipeline`.
2. The Celery worker moves the workflow through `processing` → emits follow-on AI events (`ocr.completed`, `embeddings.generated`, `llm.analysis.completed`) → completes or enters `awaiting_human_review` / `failed` with DLQ semantics.

**Idempotency**: Send header `Idempotency-Key` on `POST /document-intelligence` to avoid duplicate workflows.

---

## 🌍 Deployment

| Component | Platform | Notes |
|-----------|----------|-------|
| **Next.js Frontend** | [Vercel](https://vercel.com) | Auto-deploy from `apps/web` |
| **FastAPI Backend** | [Railway](https://railway.app) | Docker-based |
| **PostgreSQL** | [Neon](https://neon.tech) | Serverless Postgres |
| **Redis** | [Upstash](https://upstash.com) | Serverless Redis |

See [deployment guide](docs/deployment.md) for step-by-step instructions.

---

## 📄 License

MIT — see [LICENSE](LICENSE).
