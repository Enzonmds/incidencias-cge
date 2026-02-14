FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for ffmpeg (audio conversion)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir \
    flask \
    gunicorn \
    faster-whisper

COPY . .

# Expose port 5000
EXPOSE 5000

# Run Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "1", "--timeout", "120", "app:app"]
