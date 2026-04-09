FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Switch to root to install dependencies and configure permissions
USER root

# Install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# HuggingFace requires port 7860 natively
ENV PORT=7860
EXPOSE 7860

# Give permissions to the directory (critical for Hugging Face Spaces)
RUN chmod -R 777 /app

# Run the API
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
