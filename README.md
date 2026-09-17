# Hut12

Gamified finance — referral mining, node subscriptions, daily yield. Built on Vite + React 19 + Express + Drizzle/MySQL.

> Evolving from Referral Miner Platform toward **3D gamified functional minimalism** — see migration plan in docs.

## Quick Start
```bash
npm install
cp .env.example .env   # fill GEMINI_API_KEY, payment gateway, ADMIN_*
npm run dev            # http://localhost:3000
npm run build && npm run start  # production
```

## Branches
- `main` — stable, deployable
- `dev` — integration (branch off `dev` for features/prototypes, PR back to `dev`)

## Admin
Set `ADMIN_PHONE/ADMIN_PASSWORD/ADMIN_USERNAME` in `.env`, then visit `/api/admin/access/activate` or `#/admin/access/activate`.

## Stack
React 19 · Vite 6 · Tailwind 4 · motion · three · @paper-design/shaders · Recharts · Express · Drizzle ORM · MySQL

---
Original extended docs preserved below:

# Referral Miner Platform

A full-stack, AI-powered web application for referral mining and node subscriptions.

## Overview
This platform allows users to sign up, subscribe to "AI Mining Nodes" (Bronze, Silver, Gold), and earn daily passive income in UGX. Users can also refer friends, earn bonuses, complete VIP tasks, and withdraw their earnings. The application includes a comprehensive Admin Dashboard to manage users, transactions, the node catalog, and global configurations.

## Setup & Local Development
...see previous docs / .env.example for full SmarterASP & Render deploy guides.
