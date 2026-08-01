# NEPON — Fashion E-Commerce Platform

A full-stack fashion e-commerce platform with an AI-powered recommendation engine, enterprise-grade security, and a containerized microservices architecture.

## Features

- **Product catalog** — search, category filters, pagination, and rich product detail pages
- **Commerce flows** — shopping cart, wishlist, checkout, order tracking, and product reviews
- **Authentication & security** — JWT access/refresh tokens, TOTP MFA, password breach detection (HIBP), CSRF protection, CAPTCHA challenges, rate limiting, IP blocklisting, input sanitization, and full audit logging
- **Role-based access control** — customer, seller, and admin roles
- **Admin dashboard** — user management, security monitoring, and audit trail
- **Seller portal** — product listing management
- **AI recommendations** — hybrid engine combining collaborative filtering (SVD) and content-based similarity (TF-IDF) served by a dedicated Python service
- **Notifications** — in-app notifications for orders, reviews, and account events
- **Dockerized deployment** — four services orchestrated with Docker Compose behind an Nginx reverse proxy

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, GSAP, lucide-react |
| Backend | Node.js, Express 5, TypeScript, MongoDB (Mongoose), Redis (ioredis) |
| AI Engine | Python, FastAPI, scikit-learn (TF-IDF + SVD) |
| Security | Helmet, JWT, speakeasy (TOTP), xss-sanitize, express-rate-limit |
| Testing | Jest, Supertest, mongodb-memory-server |
| Infra | Docker, Docker Compose, Nginx |

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│   Browser   │─────▶│   Frontend   │─────▶│   Backend    │
│             │      │  Next.js 16  │      │  Express 5   │
└─────────────┘      └──────────────┘      └──────┬───────┘
                         ▲                        │  REST
                         │      ┌─────────────────┼──────────────┐
                  Nginx  │      ▼                 ▼              ▼
             reverse proxy│  ┌──────────┐   ┌──────────┐   ┌─────────────┐
                          │  │ MongoDB  │   │  Redis   │   │  AI Engine  │
                          │  └──────────┘   └──────────┘   │  FastAPI    │
                          │                                └─────────────┘
```

The backend exposes a REST API consumed by the Next.js frontend. The AI engine is a standalone FastAPI service that serves personalized and similar-product recommendations. MongoDB is the primary datastore; Redis backs sessions, caching, and rate limiting.

## Repository Structure

```
├── ai-engine/          # Python FastAPI recommendation service
├── backend/            # Node.js/Express REST API
│   └── src/
│       ├── config/     # Environment validation, database connection
│       ├── middleware/ # Auth, RBAC, CSRF, CAPTCHA, sanitization, audit
│       ├── models/     # Mongoose domain models
│       ├── modules/    # Feature modules (auth, catalog, cart, orders, admin…)
│       ├── scripts/    # Seeding, admin provisioning, dataset import
│       └── utils/      # Crypto, email, redis, logging, error handling
├── docker/             # Nginx reverse proxy configuration
├── docs/               # Architecture diagrams
├── frontend/           # Next.js 16 application
│   └── src/
│       ├── app/        # App Router pages
│       ├── components/ # Shared UI components
│       └── lib/        # API client, auth context
└── docker-compose.yml  # Service orchestration
```

## Getting Started

### Option A — Docker (recommended)

```bash
cp backend/.env.example backend/.env   # then fill in secrets
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000/api |
| AI Engine docs | http://localhost:8000/ml/docs |
| Nginx | http://localhost |

### Option B — Local development

**Backend** (port 5000):

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

**AI Engine** (port 8000):

```bash
cd ai-engine
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn main:app --port 8000
```

**Frontend** (port 3000):

```bash
cd frontend
npm install
npm run dev
```

### Seeding data

```bash
cd backend
npm run seed          # seed products, categories and demo users
npm run create-admin  # provision an admin account
```

The product images are sourced from a Kaggle fashion dataset; the downloaded images are stored locally in `frontend/public/dataset-images/` and are regenerated on demand.

## Testing

```bash
cd backend
npm test
```

Tests cover the auth flow (registration, login, MFA), RBAC, order model invariants, and the security module.

## Environment Variables

See `backend/.env.example` for the full list with inline documentation. Never commit real secrets — the repository ships `.env.example` templates only.
