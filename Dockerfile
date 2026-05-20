# ── API Dockerfile (root-level, used by Render) ─────────────────
FROM python:3.12-slim-bookworm

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# System deps (libpq for psycopg binary)
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first (layer cache)
COPY pyproject.toml README.md ./
RUN pip install --no-cache-dir -e .

# Copy source
COPY apps ./apps
COPY services ./services
COPY alembic ./alembic
COPY alembic.ini ./

# Render injects PORT env var; default 8000
ENV PORT=8000

EXPOSE ${PORT}

# Run migrations then start API
CMD ["sh", "-c", "alembic upgrade head && uvicorn apps.api.main:app --host 0.0.0.0 --port ${PORT}"]
