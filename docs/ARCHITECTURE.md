# Architecture Document: AI Task Processing Platform

## 1. System Overview

The platform is an asynchronous text-processing system with five main services:

- `frontend` (React): user authentication and task UI.
- `backend` (Node.js/Express): auth, task APIs, queue producer.
- `worker` (Python): queue consumer, task execution, status/log updates.
- `mongodb`: persistent storage for users and tasks.
- `redis`: queue broker for async task processing.

Core flow:
1. User signs up/logs in and receives JWT.
2. User submits a task (`title`, `inputText`, `operationType`).
3. Backend creates a task document in MongoDB with `pending` status.
4. Backend pushes a job payload into Redis queue.
5. Worker pulls jobs from Redis, updates status to `running`, executes operation, writes logs/result, and sets terminal status (`success` or `failed`).

This architecture isolates synchronous API latency from task execution latency and allows independent scaling of workers.

## 2. Data Model and Indexing Strategy

### `users` collection
- `email` is unique (enforced via schema).
- Password is stored as bcrypt hash.

### `tasks` collection
Important fields:
- `createdBy` (ObjectId)
- `status` (`pending|running|success|failed`)
- `operationType`
- `logs` array
- timestamps (`createdAt`, `updatedAt`)

Implemented indexes:
- `{ createdBy: 1, createdAt: -1 }`: efficient paginated user task history.
- `{ status: 1, createdAt: -1 }`: monitoring and operational queries by state.
- `{ operationType: 1, createdAt: -1 }`: analytics/reporting by task type.

For 100k tasks/day, these indexes keep read patterns efficient while writes remain manageable.

## 3. Worker Scaling Strategy

The worker is stateless and can be scaled horizontally:

- Multiple worker replicas consume from the same Redis queue.
- Each job is processed by one worker due to Redis list pop semantics.
- Kubernetes deployment allows increasing worker replicas independently from API/frontend.
- HPA (`worker-hpa`) scales based on CPU utilization (min 2, max 10 replicas).

Further scaling recommendations:
- Add Redis Streams or BullMQ-style visibility timeout semantics for robust acknowledgement behavior.
- Introduce queue depth metric autoscaling (KEDA on Redis queue length).
- Partition queue by task class if operation cost diverges.

## 4. Handling High Task Volume (100k tasks/day)

Target load (~1.16 tasks/sec average) is moderate, but peak traffic can be much higher. Design considerations:

- Async queue decouples request spikes from processing capacity.
- Worker pool can scale during bursts without scaling API equally.
- Backend remains lightweight: writes task doc + queue publish.
- Pagination prevents large response payloads in task history API.
- Rate limiting protects API against abusive request bursts.

Operational improvements for sustained high throughput:
- Use Redis persistence (AOF) and HA (Sentinel/managed Redis).
- Use MongoDB replica set and tune write concern for durability/performance needs.
- Add observability: queue depth, worker throughput, error rate, retries, p95 processing latency.

## 5. Redis Failure Handling

Current behavior:
- If Redis is unavailable, queue push/pop operations fail and are logged.
- Worker retry logic handles transient processing failures per task (`MAX_RETRIES`).

Recommended production hardening:
1. Redis HA: Sentinel or managed Redis with automatic failover.
2. Producer retry with exponential backoff for enqueue failures.
3. Dead-letter queue for tasks exceeding retries.
4. Idempotency checks in worker before processing duplicate deliveries.
5. Circuit breaker behavior in backend when queue health degrades.

## 6. Security Controls

- Passwords hashed with bcrypt before storage.
- JWT-based auth for protected task routes.
- Helmet middleware sets secure HTTP headers.
- Express rate limiter limits abuse.
- Secrets externalized:
  - local: `.env` files (gitignored),
  - Kubernetes: `Secret` resource.
- No production secrets are committed to the repository.

## 7. Staging and Production Deployment Model

GitOps repository structure:
- `base/` shared manifests.
- `overlays/staging` and `overlays/production` for env-specific config and tags.

Deployment flow:
1. App repository CI builds/pushes images tagged with commit SHA.
2. CI updates image tags in infra repo overlays.
3. Argo CD auto-sync detects infra repo change.
4. Argo CD applies manifests to cluster namespace.

Environment strategy:
- Staging: auto-sync from `overlays/staging`, used for integration validation.
- Production: auto-sync from `overlays/production`, protected with branch rules/manual approvals in CI policy.

## 8. Kubernetes Design Choices

- Dedicated namespace: `ai-task-platform`.
- Separate Deployments/Services for frontend, backend, Redis, MongoDB.
- Worker is Deployment without Service (queue consumer only).
- Ingress routes:
  - `/api/*` -> backend
  - `/` -> frontend
- Liveness/readiness probes on all deployable components.
- Resource requests/limits set for scheduling and stability.
- ConfigMap for non-sensitive config, Secret for sensitive values.

## 9. Trade-offs and Future Improvements

Current assignment implementation prioritizes clarity and deployability. For production maturity:
- Replace in-cluster MongoDB/Redis with managed services.
- Add distributed tracing (OpenTelemetry).
- Add structured logging + centralized log sink.
- Add integration tests with ephemeral test containers.
- Add job cancellation, timeout controls, and audit trail tables.

This architecture is suitable for the assignment scope and forms a clean baseline for production evolution.
