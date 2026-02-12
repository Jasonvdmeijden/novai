FROM python:3.13-slim

WORKDIR /app

# Install Node.js for MCP filesystem server
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install the MCP filesystem server globally
RUN npm install -g @modelcontextprotocol/server-filesystem

COPY agent-service/pyproject.toml agent-service/README.md ./
RUN pip install --no-cache-dir -e .

COPY agent-service/ .

# Ensure /data directory exists and is writable
RUN mkdir -p /data && chmod 755 /data

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
