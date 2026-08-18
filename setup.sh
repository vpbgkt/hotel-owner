#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Hotel Manager — One-Command Setup Script
# Usage:  bash setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

BOLD=$(tput bold 2>/dev/null || echo "")
GREEN=$(tput setaf 2 2>/dev/null || echo "")
YELLOW=$(tput setaf 3 2>/dev/null || echo "")
CYAN=$(tput setaf 6 2>/dev/null || echo "")
RED=$(tput setaf 1 2>/dev/null || echo "")
RESET=$(tput sgr0 2>/dev/null || echo "")

step() { echo "${CYAN}${BOLD}▶ $1${RESET}"; }
ok()   { echo "${GREEN}  ✔ $1${RESET}"; }
warn() { echo "${YELLOW}  ⚠ $1${RESET}"; }
fail() { echo "${RED}  ✖ $1${RESET}"; }

echo ""
echo "${BOLD}╔══════════════════════════════════════════╗${RESET}"
echo "${BOLD}║       Hotel Manager — Setup Script       ║${RESET}"
echo "${BOLD}╚══════════════════════════════════════════╝${RESET}"
echo ""

# ── 1. Check Node.js ────────────────────────────────────────────────────────
step "Checking Node.js..."
if ! command -v node &>/dev/null; then
  fail "Node.js not found. Install Node.js 18+ from https://nodejs.org/"
  exit 1
fi
NODE_VER=$(node -e "process.exit(parseInt(process.versions.node.split('.')[0]) < 18 ? 1 : 0)" 2>&1 && echo "ok" || echo "old")
if [ "$NODE_VER" = "old" ]; then
  fail "Node.js 18+ required. Current: $(node -v)"
  exit 1
fi
ok "Node.js $(node -v) detected"

# ── 2. Check npm ────────────────────────────────────────────────────────────
if ! command -v npm &>/dev/null; then
  fail "npm not found."
  exit 1
fi
ok "npm $(npm -v) detected"

# ── 3. Backend — copy .env ──────────────────────────────────────────────────
step "Setting up backend environment..."
cd "$(dirname "$0")/backend" 2>/dev/null || { fail "backend/ directory not found"; exit 1; }

if [ ! -f .env ]; then
  cp .env.example .env

  # Generate secure JWT secrets
  if command -v openssl &>/dev/null; then
    JWT_ACCESS=$(openssl rand -base64 48 | tr -d '\n')
    JWT_REFRESH=$(openssl rand -base64 48 | tr -d '\n')
    # Use different sed for macOS vs Linux
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s|JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=${JWT_ACCESS}|" .env
      sed -i '' "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${JWT_REFRESH}|" .env
    else
      sed -i "s|JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=${JWT_ACCESS}|" .env
      sed -i "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${JWT_REFRESH}|" .env
    fi
    ok "Generated secure JWT secrets"
  fi
  ok "Created backend/.env"
else
  ok "backend/.env already exists"
fi

# ── 4. Frontend — copy .env ─────────────────────────────────────────────────
step "Setting up frontend environment..."
cd "../frontend" 2>/dev/null || { fail "frontend/ directory not found"; exit 1; }

# ── Detect GitHub Codespaces and build correct URLs ──────────────────────────
if [ -n "$CODESPACES" ] && [ -n "$CODESPACE_NAME" ]; then
  # Codespaces: ports are exposed as https://NAME-PORT.DOMAIN
  CS_DOMAIN="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
  BACKEND_URL="https://${CODESPACE_NAME}-4000.${CS_DOMAIN}/api"
  FRONTEND_ORIGIN="https://${CODESPACE_NAME}-3000.${CS_DOMAIN}"
  ok "Codespaces detected: backend → ${BACKEND_URL}"
else
  BACKEND_URL="http://localhost:4000/api"
  FRONTEND_ORIGIN="http://localhost:3000"
fi

if [ ! -f .env.local ]; then
  cat > .env.local <<ENVEOF
NEXT_PUBLIC_API_URL=${BACKEND_URL}
# Optional: Add Razorpay test key for payment testing
# NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
ENVEOF
  ok "Created frontend/.env.local (API → ${BACKEND_URL})"
else
  # Update existing .env.local with the correct API URL
  if grep -q "NEXT_PUBLIC_API_URL" .env.local; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=${BACKEND_URL}|" .env.local
    else
      sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=${BACKEND_URL}|" .env.local
    fi
  else
    echo "NEXT_PUBLIC_API_URL=${BACKEND_URL}" >> .env.local
  fi
  ok "frontend/.env.local updated (API → ${BACKEND_URL})"
fi

# Update backend FRONTEND_URL for CORS
cd "../backend"
if grep -q "FRONTEND_URL" .env; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|FRONTEND_URL=.*|FRONTEND_URL=${FRONTEND_ORIGIN}|" .env
  else
    sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=${FRONTEND_ORIGIN}|" .env
  fi
else
  echo "FRONTEND_URL=${FRONTEND_ORIGIN}" >> .env
fi
ok "backend/.env FRONTEND_URL → ${FRONTEND_ORIGIN}"
cd "../frontend"

cd ..

# ── 5. Install backend dependencies ─────────────────────────────────────────
step "Installing backend dependencies..."
cd backend
npm install --prefer-offline 2>&1 | tail -3
ok "Backend dependencies installed"
cd ..

# ── 6. Install frontend dependencies ────────────────────────────────────────
step "Installing frontend dependencies..."
cd frontend
npm install --prefer-offline 2>&1 | tail -3
ok "Frontend dependencies installed"
cd ..

# ── 7. Check for Docker / start PostgreSQL + Redis ──────────────────────────
step "Checking for Docker..."
USE_DOCKER=false
if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
  ok "Docker is running"
  USE_DOCKER=true

  step "Starting PostgreSQL + Redis via docker-compose..."
  docker compose up postgres redis -d 2>&1 | tail -3

  echo -n "  Waiting for PostgreSQL to be ready"
  for i in $(seq 1 30); do
    if docker exec hotel-postgres pg_isready -U hotel &>/dev/null 2>&1; then
      echo ""
      ok "PostgreSQL is ready"
      break
    fi
    echo -n "."
    sleep 1
  done

  # Update backend/.env to use docker PostgreSQL
  DB_PASS="hotel_secret"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|DB_HOST=.*|DB_HOST=localhost|" backend/.env
    sed -i '' "s|DB_NAME=.*|DB_NAME=hotel|" backend/.env
    sed -i '' "s|DB_USER=.*|DB_USER=hotel|" backend/.env
    sed -i '' "s|DB_PASSWORD=.*|DB_PASSWORD=${DB_PASS}|" backend/.env
    sed -i '' "s|REDIS_PASSWORD=.*|REDIS_PASSWORD=hotel_redis|" backend/.env
  else
    sed -i "s|DB_HOST=.*|DB_HOST=localhost|" backend/.env
    sed -i "s|DB_NAME=.*|DB_NAME=hotel|" backend/.env
    sed -i "s|DB_USER=.*|DB_USER=hotel|" backend/.env
    sed -i "s|DB_PASSWORD=.*|DB_PASSWORD=${DB_PASS}|" backend/.env
    sed -i "s|REDIS_PASSWORD=.*|REDIS_PASSWORD=hotel_redis|" backend/.env
  fi
  ok "backend/.env updated to use Docker PostgreSQL"
else
  warn "Docker not found or not running — will use SQLite (persistent) for development"
  warn "Install Docker for full PostgreSQL support: https://www.docker.com"
fi

# ── 8. Seed database ────────────────────────────────────────────────────────
step "Seeding database with demo data..."
cd backend

if [ "$USE_DOCKER" = true ]; then
  # Run Sequelize seeder with real PostgreSQL
  node -e "
    require('dotenv').config();
    const { connectDatabase } = require('./config/database');
    const { sequelize } = require('./config/database');
    const models = require('./models');
    connectDatabase()
      .then(() => { console.log('Database ready'); process.exit(0); })
      .catch((e) => { console.error(e.message); process.exit(1); });
  " 2>&1 && ok "Database seeded via server init" || {
    warn "Auto-seed failed — will seed on first server start"
  }
else
  # SQLite — will auto-seed on first server start
  node -e "
    require('dotenv').config();
    const { connectDatabase } = require('./config/database');
    connectDatabase()
      .then(() => { console.log('SQLite initialized'); process.exit(0); })
      .catch((e) => { console.error(e.message); process.exit(1); });
  " 2>&1 && ok "SQLite database initialized with demo data" || {
    warn "DB init will happen on server start"
  }
fi
cd ..

# ── 9. Done — Print summary ─────────────────────────────────────────────────
echo ""
echo "${BOLD}${GREEN}╔══════════════════════════════════════════════════════╗${RESET}"
echo "${BOLD}${GREEN}║              ✔  Setup Complete!                      ║${RESET}"
echo "${BOLD}${GREEN}╚══════════════════════════════════════════════════════╝${RESET}"
echo ""
echo "${BOLD}Start the app:${RESET}"
echo "  ${CYAN}Terminal 1 (backend):${RESET}  cd backend && npm run dev"
echo "  ${CYAN}Terminal 2 (frontend):${RESET} cd frontend && npm run dev"
echo ""
echo "${BOLD}Access URLs:${RESET}"
echo "  ${CYAN}Website:${RESET}       http://localhost:3000"
echo "  ${CYAN}Admin Panel:${RESET}   http://localhost:3000/admin"
echo "  ${CYAN}API:${RESET}           http://localhost:4000/api"
echo ""
echo "${BOLD}Demo Login Credentials:${RESET}"
echo "  ${CYAN}Admin:${RESET}  admin@grandhorizon.com  /  Admin@123"
echo "  ${CYAN}Guest:${RESET}  guest@example.com       /  Guest@123"
echo ""
echo "${BOLD}Razorpay Demo Payments:${RESET}"
echo "  Add ${YELLOW}NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxx${RESET} to frontend/.env.local"
echo "  Add ${YELLOW}RAZORPAY_KEY_ID=rzp_test_xxxx${RESET} to backend/.env"
echo "  Get test keys at: https://dashboard.razorpay.com (Test Mode)"
echo ""
if [ "$USE_DOCKER" != true ]; then
  echo "${YELLOW}Note:${RESET} Using SQLite for data storage (no Docker required)."
  echo "  Data is saved to: ${CYAN}backend/data/dev.sqlite${RESET}"
  echo "  To use PostgreSQL: ${CYAN}docker compose up postgres redis -d${RESET}"
  echo ""
fi
