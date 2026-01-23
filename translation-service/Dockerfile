# Use Python 3.11 slim image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && \
  apt-get install -y --no-install-recommends \
  build-essential \
  git \
  curl \
  && rm -rf /var/lib/apt/lists/* \
  && apt-get clean

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src ./src

# Create directories
RUN mkdir -p models logs && \
  chmod -R 755 models logs

# Set PYTHONPATH to include src directory for proper imports
ENV PYTHONPATH=/app/src

# Download models during build (optional - comment out for faster builds)
# RUN python -c "from transformers import MarianMTModel, MarianTokenizer; \
#     MarianMTModel.from_pretrained('Helsinki-NLP/opus-mt-en-hi', cache_dir='./models'); \
#     MarianMTModel.from_pretrained('Helsinki-NLP/opus-mt-hi-en', cache_dir='./models')"

# Expose port
EXPOSE 7777

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
  CMD curl -f http://localhost:7777/health || exit 1

# Change workdir to src for proper relative imports
WORKDIR /app/src

# Run with gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:7777", "--workers", "2", "--threads", "4", "--timeout", "120", "--graceful-timeout", "30", "app:app"]


