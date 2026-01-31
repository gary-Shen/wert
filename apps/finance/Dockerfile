FROM python:3.13-slim

WORKDIR /app

# Install PDM
RUN pip install --no-cache-dir pdm

# Copy dependency files
COPY pyproject.toml pdm.lock* ./

# Install dependencies (production only, no lock file generation)
RUN pdm install --prod --no-lock --no-self

# Copy all application code
COPY main.py cache_manager.py models.py ./
COPY data_sources/ ./data_sources/

# Expose port
EXPOSE 8001

# Run the application
CMD ["pdm", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
