from __future__ import annotations

import random
from datetime import UTC, datetime, timedelta
from uuid import UUID

import structlog
from celery import chain
from sqlalchemy import select
from sqlalchemy.orm import Session

from apps.api.celery_app import celery_app
from apps.api.config import get_settings
from apps.api.db.models import Event, EventStatus, Workflow, WorkflowStatus
from apps.api.db.session import SessionLocal
from apps.api.services import workflow_repository as wf_repo

log = structlog.get_logger(__name__)


def _handle_failure(db: Session, wf: Workflow, doc_ev: Event, current_ev: Event, step_name: str, exc: Exception) -> None:
    settings = get_settings()
    wf_repo.mark_event_status(db, current_ev, EventStatus.FAILED)
    wf.retry_count += 1
    current_ev.retry_count = wf.retry_count
    
    scheduled_for = datetime.now(UTC) + timedelta(
        seconds=settings.workflow_retry_backoff_base_seconds * (2 ** max(0, wf.retry_count - 1))
    )
    wf_repo.transition_workflow(db, wf, WorkflowStatus.RETRYING, error=str(exc))
    wf_repo.record_retry_schedule(
        db,
        event=current_ev,
        retry_number=wf.retry_count,
        scheduled_for=scheduled_for,
        error_message=str(exc),
    )
    
    wf_repo.create_event(
        db,
        workflow_id=wf.id,
        event_type="workflow.failed",
        payload={"step": step_name, "error": str(exc)},
        status=EventStatus.COMPLETED,
    )
    
    if wf.retry_count >= settings.workflow_max_retries:
        wf_repo.mark_dead_letter(
            db,
            wf,
            current_ev,
            reason=f"{step_name} exceeded retry budget",
        )
        wf_repo.create_event(
            db,
            workflow_id=wf.id,
            event_type="retry.scheduled",
            payload={"status": "dead_letter"},
            status=EventStatus.COMPLETED,
        )
    
    db.commit()
    
    if wf.status != WorkflowStatus.FAILED:
        countdown = settings.workflow_retry_backoff_base_seconds * (2 ** max(0, wf.retry_count - 1))
        process_document_pipeline.apply_async(
            args=[str(wf.id), str(doc_ev.id)],
            countdown=int(countdown),
        )
        log.warning(
            "pipeline_retry_scheduled",
            workflow_id=str(wf.id),
            retry=wf.retry_count,
            countdown=countdown,
        )


@celery_app.task(name="workflow_engine.process_document_pipeline", bind=True, max_retries=0)
def process_document_pipeline(self, workflow_id: str, document_event_id: str) -> None:
    db = SessionLocal()
    settings = get_settings()
    try:
        wf = db.get(Workflow, UUID(workflow_id))
        doc_ev = db.get(Event, UUID(document_event_id))
        
        if not wf or not doc_ev:
            log.warning("pipeline_missing_rows", workflow_id=workflow_id)
            return
            
        if wf.status in (WorkflowStatus.COMPLETED, WorkflowStatus.FAILED, WorkflowStatus.AWAITING_HUMAN_REVIEW):
            return

        if wf.status in (WorkflowStatus.PENDING, WorkflowStatus.RETRYING):
            wf_repo.transition_workflow(db, wf, WorkflowStatus.PROCESSING)

        if doc_ev.status != EventStatus.COMPLETED:
            wf_repo.mark_event_status(db, doc_ev, EventStatus.PROCESSING)
            doc_ev.processed_at = datetime.now(UTC)
            wf_repo.mark_event_status(db, doc_ev, EventStatus.COMPLETED)

        # Step: OCR
        ocr_ev = db.execute(
            select(Event).where(Event.workflow_id == wf.id, Event.event_type == "ocr.completed")
        ).scalar_one_or_none()
        if not ocr_ev or ocr_ev.status != EventStatus.COMPLETED:
            if not ocr_ev:
                ocr_started = wf_repo.create_event(db, workflow_id=wf.id, event_type="ocr.processing.started")
                wf_repo.mark_event_status(db, ocr_started, EventStatus.COMPLETED)
                ocr_ev = wf_repo.create_event(db, workflow_id=wf.id, event_type="ocr.completed", status=EventStatus.PROCESSING)
                db.flush()
            else:
                wf_repo.mark_event_status(db, ocr_ev, EventStatus.PROCESSING)
            
            try:
                if settings.simulate_external_failure and random.random() < 0.2:
                    raise RuntimeError("OCR extraction timeout")
                
                wf_repo.mark_event_status(db, ocr_ev, EventStatus.COMPLETED)
                ocr_ev.processed_at = datetime.now(UTC)
            except Exception as exc:
                _handle_failure(db, wf, doc_ev, ocr_ev, "ocr.completed", exc)
                return

        # Step: Embeddings
        embed_ev = db.execute(
            select(Event).where(Event.workflow_id == wf.id, Event.event_type == "embeddings.generated")
        ).scalar_one_or_none()
        if not embed_ev or embed_ev.status != EventStatus.COMPLETED:
            if not embed_ev:
                embed_ev = wf_repo.create_event(db, workflow_id=wf.id, event_type="embeddings.generated", status=EventStatus.PROCESSING)
                db.flush()
            else:
                wf_repo.mark_event_status(db, embed_ev, EventStatus.PROCESSING)
                
            try:
                if settings.simulate_external_failure and random.random() < 0.2:
                    raise RuntimeError("vector DB unavailable")
                wf_repo.mark_event_status(db, embed_ev, EventStatus.COMPLETED)
                embed_ev.processed_at = datetime.now(UTC)
            except Exception as exc:
                _handle_failure(db, wf, doc_ev, embed_ev, "embeddings.generated", exc)
                return

        # Step: LLM Analysis
        llm_ev = db.execute(
            select(Event).where(Event.workflow_id == wf.id, Event.event_type == "llm.analysis.completed")
        ).scalar_one_or_none()
        if not llm_ev or llm_ev.status != EventStatus.COMPLETED:
            if not llm_ev:
                llm_started = wf_repo.create_event(db, workflow_id=wf.id, event_type="llm.analysis.started")
                wf_repo.mark_event_status(db, llm_started, EventStatus.COMPLETED)
                llm_ev = wf_repo.create_event(db, workflow_id=wf.id, event_type="llm.analysis.completed", status=EventStatus.PROCESSING)
                db.flush()
            else:
                wf_repo.mark_event_status(db, llm_ev, EventStatus.PROCESSING)
                
            try:
                if settings.simulate_external_failure and random.random() < 0.2:
                    raise RuntimeError("LLM response timeout")
                
                wf_repo.mark_event_status(db, llm_ev, EventStatus.COMPLETED)
                llm_ev.processed_at = datetime.now(UTC)
                
                confidence_score = random.random()
                wf_repo.create_event(db, workflow_id=wf.id, event_type="confidence.scored", payload={"score": confidence_score}, status=EventStatus.COMPLETED)
            except Exception as exc:
                _handle_failure(db, wf, doc_ev, llm_ev, "llm.analysis.completed", exc)
                return

        # Check Confidence and Review
        conf_ev = db.execute(
            select(Event).where(Event.workflow_id == wf.id, Event.event_type == "confidence.scored")
        ).scalar_one_or_none()
        
        if conf_ev and conf_ev.payload and conf_ev.payload.get("score", 1.0) < 0.3:
            hr_ev = db.execute(
                select(Event).where(Event.workflow_id == wf.id, Event.event_type == "human.review.required")
            ).scalar_one_or_none()
            if not hr_ev:
                wf_repo.create_event(db, workflow_id=wf.id, event_type="human.review.required", status=EventStatus.COMPLETED)
                wf_repo.transition_workflow(db, wf, WorkflowStatus.AWAITING_HUMAN_REVIEW)
                db.commit()
                return

        # CRM Sync
        crm_ev = db.execute(
            select(Event).where(Event.workflow_id == wf.id, Event.event_type == "crm.sync.completed")
        ).scalar_one_or_none()
        if not crm_ev or crm_ev.status != EventStatus.COMPLETED:
            if not crm_ev:
                crm_ev = wf_repo.create_event(db, workflow_id=wf.id, event_type="crm.sync.completed", status=EventStatus.PROCESSING)
                db.flush()
            else:
                wf_repo.mark_event_status(db, crm_ev, EventStatus.PROCESSING)
                
            try:
                if settings.simulate_external_failure and random.random() < 0.1:
                    raise RuntimeError("CRM sync failure")
                wf_repo.mark_event_status(db, crm_ev, EventStatus.COMPLETED)
                crm_ev.processed_at = datetime.now(UTC)
            except Exception as exc:
                _handle_failure(db, wf, doc_ev, crm_ev, "crm.sync.completed", exc)
                return

        # Done
        done = db.execute(
            select(Event).where(Event.workflow_id == wf.id, Event.event_type == "workflow.completed")
        ).scalar_one_or_none()
        if not done:
            wf_repo.create_event(
                db,
                workflow_id=wf.id,
                event_type="workflow.completed",
                payload={"summary": "document intelligence pipeline finished"},
                status=EventStatus.COMPLETED,
            )
        wf_repo.transition_workflow(db, wf, WorkflowStatus.COMPLETED)
        log.info("document_pipeline_completed", workflow_id=str(wf.id))
        db.commit()

    except Exception:
        db.rollback()
        log.exception("process_document_pipeline_failed", workflow_id=workflow_id)
        raise
    finally:
        db.close()
