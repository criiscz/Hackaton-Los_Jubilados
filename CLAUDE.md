# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Matchmoji** is a dating app where users can only communicate using emojis. Core rules:

- Users register with name, email, interest/preference, and a personal emoji.
- Main feed shows match cards (swipe-style match / no-match decisions).
- When two users match, they schedule a time to start the chat.
- Chats last **2 minutes**. Extending the chat requires a payment.
- During chat, the only input is an on-screen emoji keyboard (10–20 emojis). No letters, numbers, or symbols are allowed.
- The platform includes a recommendation engine and a "labia" (charisma) rating system based on emoji conversations.

Stack: React 18 frontend (Vite + `@vitejs/plugin-react`) + Express.js backend + MongoDB (Mongoose), orchestrated by Docker Compose. The original scaffold was a CRA todo demo; it has been migrated to Vite and is being rebuilt as the Matchmoji product.

## Hard Constraints (non-negotiable)

1. **WebSocket-only transport.** All frontend ↔ backend communication MUST go over a WebSocket connection. Do NOT add or use REST endpoints (no `axios.get('/api/...')`, no `fetch('/api/...')`). The Express server exposes a single WS endpoint; client sends typed messages and listens for server pushes. The existing `/api/todos` routes and any leftover REST scaffolding are deprecated and must be removed as features are ported.
2. **Demo mode is mandatory.** The product must ship with a `?demo=1` (or `/demo` route) entry point that boots with believable seeded data — profiles, matches, an in-progress chat — and requires no registration, no backend, and no payment. The demo must be usable end-to-end (browse feed, "match", open a chat with a fake counterpart that responds with scripted emoji replies) so anyone can be shown the product cold.
3. **English only.** All UI copy, microcopy, labels, error messages, placeholders, and meta tags must be in English. No Spanish strings anywhere in the shipped product. Internal code/comments stay in English too. Existing Spanish copy in `frontend/index.html`, screen files, and emoji `label` fields must be translated before merge.

## Quick Start

### Docker Compose (recommended)

```bash
docker compose up -d
```

Services:
- **frontend**: React dev server on `http://localhost:4000` (override with `FRONTEND_PORT`).
- **backend**: Express server, container-internal port 3000, proxied by the frontend.
- **mongo**: MongoDB, container-internal only (no host port binding).

Hot reload via volume mounts. Logs: `docker compose logs -f <service>`. Tear down: `docker compose down`.

### Local (without Docker)

Backend:
```bash
cd backend
npm install
npm run dev          # nodemon
npm start            # production
npm run lint         # prettier --check
npm run format       # prettier --write
```

Frontend:
```bash
cd frontend
npm install
npm run dev          # Vite dev server with HMR (PORT env var; defaults to 4000)
npm start            # alias of npm run dev
npm run build        # production build to /build
npm run preview      # serve the production build locally
```

Backend listens on 3000; Vite defaults to 4000. The CRA `proxy` field has been replaced by `server.proxy` in [frontend/vite.config.js](frontend/vite.config.js). Change the proxy target there if the backend runs elsewhere.

## Architecture

### Backend (`backend/`)

Entry: `server.js`. Loads config from `config/config.js` (env vars from `config/config.json` keyed by `NODE_ENV`), wires Express with `cors`, `body-parser`, `cookie-parser`, connects to Mongo via `db/index.js` (2s reconnect loop), registers routes from `routes/index.js`, emits a `ready` event once DB is up, listens on port 3000.

Key files (current scaffold — to be rewritten for Matchmoji domain):
- `config/messages.js`: standardized response/error strings.
- `db/index.js`: Mongoose connection with auto-reconnect.
- `routes/index.js`: legacy REST (`GET /api`, `POST /api/todos`) — **delete**, replaced by a single WS endpoint per the hard constraint.
- `models/todos/todo.js`: legacy Todo schema (to be replaced by User, Match, Chat, Message models).
- `utils/helpers/responses.js`: `sendSuccess` / `sendError` — adapt to WS message envelopes.

**Transport — WebSocket only:**
- Single WS endpoint (e.g. `ws://backend:3000/ws`). All traffic is JSON frames: `{ type, payload, id? }`.
- Suggested message types: `auth`, `feed:next`, `swipe`, `match:scheduled`, `chat:join`, `chat:send`, `chat:tick`, `chat:expired`, `payment:extend`.
- Errors are pushed as `{ type: 'error', code, message }` using strings from `config/messages.js`.
- No REST routes may be added.

### Frontend (`frontend/`)

Vite 5 + React 18 + Tailwind v4 + SCSS tokens + `react-router-dom`. Dev WS proxy (`/ws → ws://backend:3000`) belongs in [frontend/vite.config.js](frontend/vite.config.js) — Axios is no longer needed and should be removed. See [frontend/CLAUDE.md](frontend/CLAUDE.md) for screens, UX rules, demo-mode behavior, and design guidance.

## Domain Model (target)

Entities expected as the product evolves:
- **User**: name, email, interest, signature emoji, labia rating.
- **Match**: pair of users + scheduled start time + status (`pending`, `scheduled`, `active`, `expired`, `extended`).
- **Chat**: tied to a Match, with `startedAt`, `duration` (default 120s), `extended` flag.
- **Message**: chat id, sender id, single emoji, timestamp.
- **Payment**: chat id, user id, amount, status — gates chat extensions.

WS contract is not yet implemented for Matchmoji; the existing `/api/todos` routes are placeholder and will be deleted with the WS rewrite.

## Docker Compose Networking

Networks: `react-express` (frontend ↔ backend) and `express-mongo` (backend ↔ mongo). Frontend connects to the backend WebSocket via `ws://backend:3000/ws` (proxied through Vite in dev). Backend connects to Mongo via `mongo:27017`. Only the frontend's port is host-bound; backend (3000) and mongo (27017) are container-internal via compose `expose`.

## Conventions

- Backend formatting: Prettier (`npm run lint` / `npm run format`).
- Frontend: function components with hooks. React 18 `createRoot`. Router wired in [frontend/src/App.jsx](frontend/src/App.jsx).
- Standardized WS responses via `utils/helpers/responses.js` and `config/messages.js`.
- All shipped strings are English (see Hard Constraint #3).
- Hot reload in Docker via volume mounts; no manual restart needed.

## Notes

- Legacy todo code (`AddTodo`, `TodoList`, `/api/todos`, `Todo` model) is throwaway scaffolding — replace as Matchmoji features land.
- No auth yet despite password-related strings in `messages.js`; registration/login flow needs to be built.
- No backend tests configured.
