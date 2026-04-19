# AI Task Processing Platform

Microservices-based async text task platform using:
- Frontend: React
- Backend API: Node.js + Express + JWT
- Worker: Python
- Database: MongoDB
- Queue: Redis
- Containers: Docker + Docker Compose

## Features
- User registration and login with JWT auth
- Create text-processing tasks:
  - Uppercase
  - Lowercase
  - Reverse string
  - Word count
- Run tasks asynchronously via Redis queue
- Worker updates lifecycle status:
  - `pending` -> `running` -> `success|failed`
- Persisted results, errors, and execution logs
- Pagination for task history
- Retry mechanism for failed jobs (`MAX_RETRIES`)
- API rate limiting on backend

## Project Structure
```text
.
├── backend
├── frontend
├── worker
└── docker-compose.yml
```

## Quick Start (Docker)
1. Make sure Docker and Docker Compose are installed.
2. From project root:
   ```bash
   docker compose up --build
   ```
3. Access:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Backend health: http://localhost:5000/health

## Main API Endpoints
### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`

### Tasks (Bearer token required)
- `POST /api/tasks` create a task
- `POST /api/tasks/:id/run` queue task for async processing
- `GET /api/tasks?page=1&limit=10` list paginated tasks
- `GET /api/tasks/:id` get full task details
- `GET /api/tasks/:id/logs` get execution logs

## Notes
- All service images are multi-stage and run as non-root users.
- Worker service reads jobs from Redis list queue (`LPUSH/BRPOP`).
- Mongo document logs are stored in the `logs` array for each task.
