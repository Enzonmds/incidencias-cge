
FROM python:3.10-slim

# Install system dependencies (FFmpeg is critical)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy App
COPY app.py .

# Create cache directory for models
RUN mkdir -p /root/.cache/huggingface

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "1", "--timeout", "300", "app:app"]
