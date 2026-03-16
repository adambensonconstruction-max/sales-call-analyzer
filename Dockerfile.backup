FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Set Python path for imports
ENV PYTHONPATH=/app/backend

# Expose port
EXPOSE 5000

# Run with simple HTTP server for testing
CMD ["python", "backend/simple_server.py"]
