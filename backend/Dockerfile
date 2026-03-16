# Backend Dockerfile for Sales Call Analyzer
# Multi-stage build for optimized production image

# ============================================================================
# Stage 1: Builder
# ============================================================================
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# ============================================================================
# Stage 2: Production
# ============================================================================
FROM python:3.11-slim as production

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Copy application code
COPY --chown=appuser:appuser . .

# Create uploads directory
RUN mkdir -p /app/uploads && chown -R appuser:appuser /app/uploads

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Run with gunicorn
# Using gevent worker for better async handling
CMD ["gunicorn", \
     "-w", "4", \
     "-k", "gevent", \
     "--worker-connections", "1000", \
     "--max-requests", "1000", \
     "--max-requests-jitter", "50", \
     "--timeout", "120", \
     "--keep-alive", "5", \
     "--bind", "0.0.0.0:5000", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--capture-output", \
     "--enable-stdio-inheritance", \
     "main:app"]

# ============================================================================
# Stage 3: Development (optional target)
# ============================================================================
FROM production as development

USER root

# Install development tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    vim \
    && rm -rf /var/lib/apt/lists/*

# Switch back to appuser
USER appuser

# Run Flask development server (with hot reload)
ENV FLASK_DEBUG=1
CMD ["python", "main.py"]
