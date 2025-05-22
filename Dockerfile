FROM python:3.12.10-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p data/images static

# Expose port
EXPOSE 8000

# Run the application
CMD ["python", "app.py"] 