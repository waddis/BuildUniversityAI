# fieldcam.app

Field documentation platform for adjusters, inspectors, contractors, and restoration teams. Capture photos, organize by project, sync to the cloud, generate professional reports.

## Architecture

| Component | Tech | Location |
|-----------|------|----------|
| Web App | Next.js 14 + TypeScript + Tailwind | `apps/web` |
| API | FastAPI + SQLAlchemy + PostgreSQL | `apps/api` |
| iPhone App | SwiftUI + Xcode | `apps/mobile-ios` |
| Worker | arq + Redis | `apps/worker` |
| Storage | S3-compatible (MinIO local) | — |

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Python 3.12+
- Xcode 15+ (for iOS)

### 1. Clone and configure

```bash
git clone <repo-url> fieldcam-app
cd fieldcam-app
cp .env.example .env
```

### 2. Start infrastructure

```bash
docker compose up postgres redis minio minio-init mailhog -d
```

### 3. Run the API

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
python -m app.seed  # optional seed data
uvicorn app.main:app --reload --port 8000
```

API docs available at http://localhost:8000/docs

### 4. Run the web app

```bash
cd apps/web
npm install
npm run dev
```

Web app at http://localhost:3000

### 5. Run the worker

```bash
cd apps/api
arq app.worker.WorkerSettings
```

### 6. iOS app

Open `apps/mobile-ios/FieldCam.xcodeproj` in Xcode and run on simulator or device.

### Local Services

| Service | URL |
|---------|-----|
| Web App | http://localhost:3000 |
| API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| MinIO Console | http://localhost:9001 |
| MailHog | http://localhost:8025 |

## Project Structure

```
fieldcam-app/
  apps/
    web/              # Next.js frontend
    api/              # FastAPI backend
    mobile-ios/       # SwiftUI iPhone app
    worker/           # Background job processing
  packages/
    types/            # Shared TypeScript types
    ui/               # Shared UI components
    config/           # Shared config (eslint, tsconfig)
  infrastructure/
    docker/           # Docker configs
    terraform/        # Infrastructure as code
  docs/
    api/              # API documentation
    product/          # Product documentation
```

## Roles

| Role | Access |
|------|--------|
| Owner | Full company access, billing, role changes |
| Admin | Full operational access, manage users/projects |
| Manager | Manage projects, create reports, assign users |
| Field User | Capture, upload, view assigned projects |
| Viewer | Read-only access to permitted projects |
