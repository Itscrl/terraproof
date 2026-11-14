FROM node:24-bookworm-slim AS frontend
WORKDIR /app/frontend
RUN npm install -g pnpm@11.25.0
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm build

FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir uv==0.11.2
COPY pyproject.toml uv.lock ./
COPY src/ src/
RUN uv sync --frozen --no-dev
COPY data/reference/ data/reference/
COPY --from=frontend /app/frontend/dist frontend/dist/
RUN useradd --create-home terraproof && mkdir -p /app/data/local /app/data/cache && chown -R terraproof:terraproof /app/data
USER terraproof
ENV TERRAPROOF_DATA_DIR=/app/data
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s CMD [".venv/bin/python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health')"]
CMD [".venv/bin/uvicorn", "terraproof.api:app", "--host", "0.0.0.0", "--port", "8000"]
