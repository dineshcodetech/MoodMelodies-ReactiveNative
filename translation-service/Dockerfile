# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src ./src

# Create directories
RUN mkdir -p models logs && \
    chmod -R 755 models logs

# Download models during build (optional - comment out for faster builds)
# RUN python -c "from transformers import MarianMTModel, MarianTokenizer; \
#     MarianMTModel.from_pretrained('Helsinki-NLP/opus-mt-en-hi', cache_dir='./models'); \
#     MarianMTModel.from_pretrained('Helsinki-NLP/opus-mt-hi-en', cache_dir='./models')"

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:5000/health', timeout=3)"

# Run with gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--threads", "4", "--timeout", "60", "src.app:app"]


