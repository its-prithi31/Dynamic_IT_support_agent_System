# AI-Powered Autonomous IT Support and Secure Digital Assistant

This repository contains a split frontend/backend architecture for an enterprise-level AI-powered IT support platform.

## Project status

The current implementation includes:
- A secure IT support backend scaffold with authentication, ticketing, AI routing, guardrails, and monitoring endpoints.
- A lightweight static frontend demo page that shows the AI safety workflow and a sample support response.
- Local SQLite database support for backend development.
- Docker configuration for frontend, backend, and PostgreSQL.
- A baseline RAG and recovery service contract.

## Folder structure

- `frontend/` - React UI, routing, mock data, and API integration points.
- `backend/` - FastAPI service and persistence layer.
- `docker-compose.yml` - Development containers for frontend, backend, and PostgreSQL.

## Run locally

### Frontend only
```bash
npm run frontend:dev
```

### Backend only
```bash
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.app:app --reload --host 0.0.0.0 --port 4000
```

The frontend is now a static HTML demo page, so it can run without a bundler.
It still illustrates the intended AI control-layer flow and sample output.

#### AI and monitor endpoints

- `POST /api/ai/route` — main AI routing endpoint; body: `{ "query": "...", "context": { ... }}`. Returns `escalate`, `response`, `confidence`, `request_id`.
- `GET /api/ai/monitor/recent` — recent AI agent events (used by frontend monitor).
- `ws /ws/ai/monitor` — WebSocket stream of monitor events.

If you plan to connect a real model, set environment variables before starting the backend:

- `LLM_PROVIDER=ollama` (default) and `OLLAMA_URL=http://localhost:11434` to use a local Ollama container.
- or `LLM_PROVIDER=openai` and `OPENAI_API_KEY=...` to use OpenAI's API.

Note: If Python isn't available locally, run the full stack with Docker Compose (see below) or install Python 3.10+.
### Docker demo (no Ollama)

Use the demo compose file to run without a local Ollama instance:

```bash
docker compose -f docker-compose.demo.yml up --build
```

This starts frontend, backend, and Postgres with SQLite replaced for ease; the AI layer will use the fallback deterministic responses unless you provide OpenAI keys.

### Full stack using Docker
```bash
docker compose up --build
```

### Production deployment
- `docker-compose.prod.yml` is a production-ready compose manifest for frontend, backend, Postgres, and Ollama.
- Kubernetes manifests are available under `k8s/` for namespace, deployments, services, ingress, and secrets.

## Enterprise control workflow

The runnable control layer validates and masks input, blocks prompt-injection attempts,
retrieves approved knowledge, validates model output, and automatically creates a
human-review ticket when safety checks fail or confidence is below 85%. The agent
monitor streams each workflow event over WebSocket. Technician resolutions become
knowledge candidates; an administrator must approve a candidate before it is added to
the retrieval corpus. `POST /api/ai/feedback` records helpfulness and outcome signals
for future quality review.

## Notes

The backend currently uses stubbed AI responses and local SQLite persistence to provide a runnable scaffold.
For full enterprise readiness, install Python 3.12+, then install backend dependencies and plug in cloud or local AI connectors.

CI / Tests

- A basic GitHub Actions workflow is included at `.github/workflows/ci.yml` which runs `pytest` against a basic health check.

Redis pub/sub support

- You can enable multi-instance Monitor broadcasting by setting `REDIS_URL` (e.g. `redis://localhost:6379`) and optionally `REDIS_MONITOR_CHANNEL`.
