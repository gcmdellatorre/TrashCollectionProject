FROM python:3.12.10-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p data/images static

# Expose port (Railway assigns this dynamically)
EXPOSE 8000

# Run the application with uvicorn (PORT will be set by Railway)
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]