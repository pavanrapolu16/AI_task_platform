# AI Task Processing Platform (MERN + Python Worker)

Production-style async task platform for the MERN Full Stack Developer Intern Assignment.

## Stack
- Frontend: React
- Backend: Node.js + Express + JWT
- Worker: Python
- Database: MongoDB
- Queue: Redis
- Containers: Docker + Docker Compose
- Orchestration: Kubernetes (k3s compatible)
- GitOps: Argo CD (infra repo manifests)
- CI/CD: GitHub Actions

## Assignment Coverage
- User registration/login with bcrypt + JWT.
- Create and run async tasks (`uppercase`, `lowercase`, `reverse`, `word_count`).
- Task lifecycle tracking: `pending`, `running`, `success`, `failed`.
- Task logs and results persisted in MongoDB.
- Background queue processing via Redis.
- Dockerfiles with multi-stage builds and non-root users.
- Kubernetes manifests with namespace, services, ingress, ConfigMaps/Secrets, probes, resources.
- Worker deployment supports horizontal scaling (replicas + HPA).
- Argo CD apps configured with automated sync.
- CI/CD pipeline for lint, image build/push, and infra tag updates.

## Repositories
- Application repository: this project.
- Infrastructure repository: `infra-repo/` (structured to be pushed as a separate repo, e.g. `ai-task-platform-infra`).

## Local Run (Docker Compose)
1. Copy env template:
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp worker/.env.example worker/.env
   ```
2. Set secure values in `.env` and `backend/.env` (especially `JWT_SECRET`).
3. Start:
   ```bash
   docker compose up --build
   ```
4. Access:
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:5000`
   - Health: `http://localhost:5000/health`

## API Endpoints
### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`

### Tasks (Bearer token required)
- `POST /api/tasks` create + queue task for processing
- `POST /api/tasks/:id/run` re-queue completed/failed task
- `GET /api/tasks?page=1&limit=10` list tasks
- `GET /api/tasks/:id` task details
- `GET /api/tasks/:id/logs` task logs

## Kubernetes + Argo CD
Infra manifests are in [`infra-repo/`](/c:/Users/pavan/Documents/AI_task_platform/infra-repo/README.md).

### Quick Deploy
```bash
kubectl create namespace ai-task-platform
kubectl -n ai-task-platform create secret generic ai-task-secrets --from-literal=JWT_SECRET='<strong-random-secret>'
kubectl apply -k infra-repo/overlays/staging
```

### Argo CD Install
```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl apply -f infra-repo/argocd/application-staging.yaml
kubectl apply -f infra-repo/argocd/application-production.yaml
```

## CI/CD
Workflow file: [`.github/workflows/ci-cd.yml`](/c:/Users/pavan/Documents/AI_task_platform/.github/workflows/ci-cd.yml)

Pipeline stages:
1. Lint backend, frontend, and worker.
2. Build and push Docker images (`backend`, `frontend`, `worker`) with SHA tags.
3. Update image tags in infra repo overlays automatically.
4. Argo CD auto-sync deploys changes.

Required GitHub secrets:
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `INFRA_REPO` (example: `your-org/ai-task-platform-infra`)
- `INFRA_REPO_PAT`

## Security
- Password hashing with bcrypt (`bcryptjs`).
- JWT authentication middleware.
- Helmet middleware enabled.
- Global API rate limiting.
- Secrets externalized via env vars / Kubernetes Secret.

## Architecture Document
See [Architecture Document](/c:/Users/pavan/Documents/AI_task_platform/docs/ARCHITECTURE.md).

## Argo CD Screenshot
Add your dashboard screenshot at:
- `docs/argocd-dashboard.png`

You can then reference it in your submission package.
