# Hotel Room Boking Management — Standalone Hotel Booking Platform

A full-stack, production-grade hotel reservation system built for **single hotel owners**. Features a direct booking website, fully-featured admin dashboard, offline/walk-in counter booking, guest management, inventory calendar, dynamic branding, daily + hourly room bookings, Razorpay payments, and lightweight deployment (runs on a ₹300/month VPS).

---

## Features

### Guest-Facing Website
- **Homepage** — Hero with dynamic hotel cover image & logo, room type grid with live pricing
- **Room Detail Pages** — `/rooms/[id]` — full gallery, amenities, policies, inline booking widget
- **Online Booking** — Daily and hourly booking with real-time price preview and Razorpay checkout
- **Booking Confirmation** — Email-style confirmation with booking number

### Admin Dashboard (`/admin`)
- **Overview** — Quick-navigation grid (walk-in, bookings, guests, inventory, rooms, analytics, settings)
- **Stats** — Month revenue, occupancy rate, today's check-ins/check-outs, pending bookings
- **Recent Bookings** — Live table with status badges

### Walk-in / Offline Booking (`/admin/offline-booking`)
- Create counter bookings for walk-in guests without requiring online payment
- Supports **DAILY** and **HOURLY** booking types
- Guest lookup by phone/email — auto-fills existing guest info
- Payment method: **Cash, UPI, Card, Bank Transfer, Other**
- Real-time price preview with GST breakdown
- Booking confirmation banner with booking number

### Guest Management (`/admin/guests`)
- Searchable table of all guests who have stayed at the hotel
- Filter by name, email, or phone
- Guest detail modal — booking history, total spent, total stays
- Quick "New Booking for Guest" action

### Inventory & Availability Calendar (`/admin/inventory`)
- Monthly calendar grid per room type — colour-coded availability
- Bulk update date ranges: set available count, price override, or mark closed
- Legend: Available / Sold Out / Closed / Price Override
- Navigate between months

### Room Type Management (`/admin/rooms`)
- Create / edit / delete room types with images, amenities, pricing
- Set total room count (affects inventory availability)

### Hotel Settings (`/admin/settings`)
| Tab | Fields |
|-----|--------|
| 🖼️ Branding | Cover/hero image, hotel logo, gallery images (upload or URL) |
| 🏨 General | Name, description, star rating, booking model (daily/hourly/both), social links |
| ✨ Amenities | Toggle amenities shown on hotel page |
| 💰 Tax & GST | GST rate percentage |
| 🕐 Timings | Check-in / check-out times |
| 📞 Contact | Phone, email, address, city, state, pincode |

### Analytics (`/admin/analytics`)
- Revenue charts, occupancy trends, top room types

---

## Quick Start (Local Development)

### Prerequisites
- **Node.js 20+** — [Download here](https://nodejs.org/)
- No database setup needed for dev — uses in-memory pg-mem

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Start database
docker compose up postgres -d

# 3. Setup database
cd apps/api
npx prisma generate
npx prisma db push
npx prisma db seed
cd ../..

# 4. Start servers (in separate terminals)
npm run dev:api   # → http://localhost:4000
npm run dev:web   # → http://localhost:3000
```

**Access URLs:**
- Web: http://localhost:3000
- GraphQL: http://localhost:4000/graphql
- Swagger: http://localhost:4000/api/docs

**Login:** `admin@hotel.local` / `password123`



---

## Architecture

```
                    ┌─────────── Internet ───────────┐
                    │                                 │
              ┌─────▼──────┐                          │
              │   Nginx    │  ← SSL / Rate Limiting   │
              └──┬──────┬──┘                          │
                 │      │                             │
    ┌────────────▼┐  ┌──▼────────────┐               │
    │  Next.js 15 │  │  NestJS 10    │               │
    │  (Frontend) │  │  (GraphQL API)│               │
    │  Port 3000  │  │  Port 4000    │               │
    │             │  │               │               │
    │ • App Router│  │ • GraphQL     │               │
    │ • React 19  │  │ • REST (/api) │               │
    │ • Tailwind  │  │ • Swagger     │               │
    │ • Apollo    │  │ • Prisma ORM  │               │
    └─────────────┘  └──┬───────┬───┘               │
                        │       │                    │
              ┌─────────▼┐  ┌──▼──────────┐         │
              │PostgreSQL │  │   Redis 7   │         │
              │    16     │  │ Cache/Locks │         │
              └───────────┘  └─────────────┘         │
```

### Standalone Mode

| Surface | URL | Description |
|---------|-----|-------------|
| **Guest Website** | `yourdomain.com` | Hotel-branded booking site for guests |
| **Hotel Admin** | `yourdomain.com/admin` | Room, booking, pricing, and analytics management |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS v4, Apollo Client |
| Backend | NestJS 10, GraphQL (code-first), Prisma 6 |
| Database | PostgreSQL 16 |
| Cache/Queue | Redis 7, BullMQ |
| Auth | JWT + Refresh Tokens, OTP, Google OAuth |
| Payments | Razorpay (India) + Demo Gateway |
| Email | Nodemailer (SMTP) |
| SMS/WhatsApp | MSG91 |
| Push | Web Push (VAPID) |
| Maps | Leaflet + OpenStreetMap |
| PDF | PDFKit (invoices) |
| Monitoring | Sentry |
| Testing | Jest (40 tests), Playwright (E2E), k6 (load) |
| CI/CD | GitHub Actions |
| Infra | Docker, Nginx, Turborepo monorepo |

---

## Features

### Booking Engine
- Daily + hourly bookings with real-time availability
- Redis distributed locks for double-booking prevention
- Smart pricing with occupancy-based suggestions
- Booking modification & auto-refund on cancellation
- Walk-in booking for front desk staff
- Downloadable invoice PDF
- GST calculation for Indian compliance

### Payments
- Razorpay integration (UPI, cards, net banking, wallets)
- Demo gateway for development (auto-approves)
- Webhook verification for payment status

### Hotel Admin Dashboard (15 pages)
- Revenue, occupancy, and booking analytics
- Room type CRUD with inventory calendar
- Booking lifecycle management (confirm → check-in → check-out)
- Smart pricing engine with demand-based suggestions
- Gallery, SEO, blog, branding management
- Walk-in booking form

### Guest Experience
- Hotel detail pages with gallery, rooms, reviews
- Booking flow with secure payment
- Web push notifications for booking updates
- Booking history and review management

### Security
- JWT authentication with refresh token rotation
- Rate limiting (3 tiers: short/medium/long)
- CORS with origin whitelist
- Helmet security headers
- Role-based access control (RBAC)
- Tenant isolation guards
- Input validation (class-validator + whitelist mode)

### Infrastructure
- Swagger API docs at `/api/docs`
- GraphQL Playground at `/graphql`
- Docker Compose for dev + production
- Nginx with rate limiting, gzip, security headers
- Database backup/restore scripts (local + S3)
- k6 load test configurations
- CI pipeline with build + test
- Sentry error tracking (API + Web)

---

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Git

### Setup

```bash
# Clone
git clone https://github.com/vpbgkt/hotel-booking.git
cd hotel-booking

# Start database
docker compose up postgres -d

# Install dependencies
npm install

# Configure environment
cp apps/api/.env.example apps/api/.env

# Database setup
cd apps/api
npx prisma generate
npx prisma db push
npx prisma db seed
cd ../..

# Start servers (in separate terminals)
npm run dev:api   # → http://localhost:4000/graphql
npm run dev:web   # → http://localhost:3000
```

### Docker (all services)

```bash
docker compose up -d
docker compose exec api npx prisma db push
docker compose exec api npx prisma db seed
# Web: http://localhost:3000 | API: http://localhost:4000/graphql | Swagger: http://localhost:4000/api/docs
```

---

## Test Credentials (Development)

| Role | Email | Password | Access |
|------|-------|----------|--------|
| **Hotel Admin** | `admin@hotel.local` | `password123` | `/admin` — manage hotel |
| **Guest** | `guest@example.com` | `password123` | `/dashboard` — bookings & reviews |

### Sample Hotels (Seeded)

| Hotel | City | Stars | Booking Model |
|-------|------|-------|---------------|
| Radhika Resort | Mandarmani, WB | 4★ | Daily + Hourly |
| Mountain View Lodge | Kausani, UK | 3★ | Daily |
| City Central Hotel | New Delhi | 5★ | Daily + Hourly |

---

## API Access

| Endpoint | Type | Description |
|----------|------|-------------|
| `/graphql` | GraphQL | Main API — queries + mutations (interactive playground) |
| `/api/docs` | Swagger | REST endpoint documentation |
| `/health` | REST | Health check |
| `/api/invoices/:id` | REST | Download booking invoice PDF |
| `/api/uploads` | REST | File upload (multipart) |
| `/api/payments/razorpay/webhook` | REST | Razorpay payment webhook |

### HTTP Headers

```
Authorization: Bearer <jwt-token>     # For authenticated requests
x-hotel-id: <hotel-uuid>             # Hotel context (set by middleware from env)
```

---

## Running Tests

```bash
cd apps/api
npm test                              # 40 unit tests
npm run test:cov                      # With coverage report

npx playwright test                   # E2E tests
k6 run tests/load/k6-booking-flow.js # Load tests
```

---

## Environment Variables

### API (`apps/api/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `JWT_SECRET` | ✅ | JWT signing secret (64+ chars) |
| `JWT_REFRESH_SECRET` | ✅ | Refresh token secret |
| `RAZORPAY_KEY_ID` | | Razorpay API key |
| `RAZORPAY_KEY_SECRET` | | Razorpay secret |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | | Email server |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | | Google OAuth |
| `MSG91_AUTH_KEY` | | SMS/WhatsApp provider |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | | Web push notifications |
| `UPLOAD_PROVIDER` | | `local` (default) or `s3` |
| `SENTRY_DSN` | | Error tracking |

### Web (`apps/web/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | GraphQL endpoint |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Frontend URL |
| `NEXT_PUBLIC_RAZORPAY_KEY` | | Razorpay publishable key |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | | Google OAuth client ID |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | | Push notification key |

> Full reference: **[GUIDE.md → Section 8](GUIDE.md#8-configuration-reference)**

---

## Project Structure

```
hotel-booking/
├── apps/
│   ├── api/                    # NestJS GraphQL API
│   │   ├── prisma/             # Schema (16 models) + seed (551 lines)
│   │   ├── src/modules/        # 15 feature modules
│   │   │   ├── admin/          # Hotel admin + platform admin
│   │   │   ├── analytics/      # Revenue, occupancy, guest analytics
│   │   │   ├── auth/           # JWT, OTP, Google OAuth
│   │   │   ├── blog/           # Blog posts CRUD
│   │   │   ├── booking/        # Booking engine + invoice PDF
│   │   │   ├── commission/     # Commission tracking + settlement
│   │   │   ├── hotel/          # Hotel CRUD + search
│   │   │   ├── notification/   # Email + push + SMS/WhatsApp
│   │   │   ├── payment/        # Razorpay + webhooks
│   │   │   ├── pricing/        # Smart pricing engine
│   │   │   ├── queue/          # BullMQ job processing
│   │   │   ├── redis/          # Cache + distributed locks
│   │   │   ├── review/         # Guest reviews + ratings
│   │   │   ├── room/           # Room types + inventory
│   │   │   ├── upload/         # File upload (local + S3)
│   │   │   └── user/           # User profiles
│   │   └── src/common/         # Guards, decorators, filters
│   └── web/                    # Next.js 15 Frontend
│       └── src/
│           ├── app/            # 48 pages across 10 route groups
│           ├── components/     # 26 React components
│           └── lib/            # GraphQL, auth, tenant contexts
├── packages/                   # Shared monorepo packages
│   ├── types/                  # TypeScript types + Zod schemas
│   ├── utils/                  # Currency, date, string utilities
│   ├── config/                 # Platform constants
│   └── ui/                     # Shared React components
├── tests/
│   ├── e2e/                    # Playwright E2E tests
│   └── load/                   # k6 load test configs
├── scripts/                    # Backup + restore scripts
├── nginx/                      # Reverse proxy configuration
├── docker-compose.yml          # Development stack
├── docker-compose.prod.yml     # Production stack
├── .github/workflows/ci.yml   # GitHub Actions CI
├── GUIDE.md                    # Comprehensive project guide
└── plan.md                     # Full project plan (1,201 lines)
```

---

## Useful Commands

```bash
# Development
npm run dev:api                        # Start API (port 4000)
npm run dev:web                        # Start Web (port 3000)
docker compose up postgres redis -d    # Start DB + cache

# Database
cd apps/api
npx prisma studio                      # Visual DB editor (localhost:5555)
npx prisma db seed                     # Re-seed sample data
npx prisma db push --force-reset       # Reset database

# Testing
npm test                               # Unit tests (40 tests)
npx playwright test                    # E2E tests
k6 run tests/load/k6-booking-flow.js  # Load tests

# Production
./scripts/backup.sh --upload-s3        # Database backup
./scripts/restore.sh backups/latest.sql.gz  # Restore
openssl rand -hex 32                   # Generate secrets
npx web-push generate-vapid-keys      # Generate push keys
```

---

## License

Private — All rights reserved.
