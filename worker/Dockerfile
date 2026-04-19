# syntax=docker/dockerfile:1.7

FROM python:3.12-slim AS builder
WORKDIR /app
ENV VENV_PATH=/opt/venv
RUN python -m venv $VENV_PATH
ENV PATH="$VENV_PATH/bin:$PATH"
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.12-slim AS runner
WORKDIR /app
ENV VENV_PATH=/opt/venv
ENV PATH="$VENV_PATH/bin:$PATH"
COPY --from=builder /opt/venv /opt/venv
COPY main.py ./
RUN useradd --create-home --uid 10001 appuser && chown -R appuser:appuser /app
USER appuser
CMD ["python", "main.py"]
