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
**Hackaton-Los_Jubilados** is an emoji-only dating app built on React + Node.js + MongoDB. It features:
- React 17 frontend (Create React App) with Bootstrap 5 styling
- Express.js process that serves **only a WebSocket** at `/ws` (HTTP routes are intentionally disabled — all non-WS requests return `426 Upgrade Required`)
- MongoDB database via Mongoose ODM
- Docker Compose orchestration for local development

Stack: React 18 frontend (Vite + `@vitejs/plugin-react`) + Express.js backend + MongoDB (Mongoose), orchestrated by Docker Compose. The original scaffold was a CRA todo demo; it has been migrated to Vite and is being rebuilt as the Matchmoji product.

## Hard Constraints (non-negotiable)

1. **WebSocket-only transport.** All frontend ↔ backend communication MUST go over a WebSocket connection. Do NOT add or use REST endpoints (no `axios.get('/api/...')`, no `fetch('/api/...')`). The Express server exposes a single WS endpoint; client sends typed messages and listens for server pushes. The existing `/api/todos` routes and any leftover REST scaffolding are deprecated and must be removed as features are ported.
2. **Demo mode is mandatory.** The product must ship with a `?demo=1` (or `/demo` route) entry point that boots with believable seeded data — profiles, matches, an in-progress chat — and requires no registration, no backend, and no payment. The demo must be usable end-to-end (browse feed, "match", open a chat with a fake counterpart that responds with scripted emoji replies) so anyone can be shown the product cold.
3. **English only.** All UI copy, microcopy, labels, error messages, placeholders, and meta tags must be in English. No Spanish strings anywhere in the shipped product. Internal code/comments stay in English too. Existing Spanish copy in `frontend/index.html`, screen files, and emoji `label` fields must be translated before merge.
Users register with one of 20 allowed emojis as a profile photo, a name, and a description. Mutual likes create a match; matched users schedule a chat window where they can only send those 20 emojis for **5 minutes** (extendable). After the chat ends, a **chemistry score** is computed from the message stream by sliding a window of 3 emojis over both users' combined chronological sequence and averaging the `match_pct` of every CSV-defined combo that hits (see `backend/chemestry/emoji_chemistry_combinations.csv`).

> **WebSocket transport note** — The raw WebSocket implementation (custom RFC 6455 framing, `/ws` upgrade, masking, etc.) is already implemented in `backend/websocket.js` and `backend/utils/ws.js`. **Do not reimplement the transport or framing.** Add new features by registering handlers in `backend/handlers/index.js`.

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

**Entry Point:** `server.js`
- Loads config from `config/config.js` (sets env vars from `config/config.json` based on `NODE_ENV`)
- Creates an HTTP server that mounts a catch-all 426 handler on every HTTP path and a WebSocket upgrade handler at `/ws`
- Connects to MongoDB via `db/index.js` (Mongoose with retry logic)
- Emits "ready" event once DB connected; server listens on port 3000
Entry: `server.js`. Loads config from `config/config.js` (env vars from `config/config.json` keyed by `NODE_ENV`), wires Express with `cors`, `body-parser`, `cookie-parser`, connects to Mongo via `db/index.js` (2s reconnect loop), registers routes from `routes/index.js`, emits a `ready` event once DB is up, listens on port 3000.

**Key Files:**
- `config/config.json`: Environment-specific `MONGODB_URI`, `PORT`, `JWT_SECRET`, `CHAT_DURATION_MS`, `MAX_EXTENSIONS`
- `db/index.js`: Mongoose connection with auto-reconnect (2s retry interval)
- `websocket.js`: WS upgrade + framing + dispatcher (do not modify framing — extend via handlers)
- `utils/ws.js`: `encodeFrame` / `decodeFrame` / `send` / `sendError` helpers
- `utils/auth.js`: `hashPassword` (bcryptjs), `signToken` / `verifyToken` (jsonwebtoken)
- `utils/emojis.js`: the 20 allowed emojis, `tokenize` (whitelist-as-parser), `ALLOWED_SET`
- `utils/chemistry.js`: loads `chemestry/emoji_chemistry_combinations.csv` once at startup; `scoreSequence(emojis)` slides a window of 3 and returns `{score, hits}` (score = avg of every combo `match_pct` found)
- `chemestry/emoji_chemistry_combinations.csv`: 30 ranked 3-emoji combos used to compute chemistry
- `models/user.js`, `models/like.js`, `models/match.js`, `models/chatSession.js`, `models/message.js`: Mongoose schemas
- `handlers/index.js`: registry mapping WS message `type` → handler. `PUBLIC` types run without auth; `AUTHED` types require `socket.userId`
- `handlers/state.js`: in-process `userSockets: Map<userId, socket>` for peer routing + `sessionTimers` for auto-expire

**WebSocket Contract** (client sends `{type, payload}`; server replies `{type, ...}`)
Key files (current scaffold — to be rewritten for Matchmoji domain):
- `config/messages.js`: standardized response/error strings.
- `db/index.js`: Mongoose connection with auto-reconnect.
- `routes/index.js`: legacy REST (`GET /api`, `POST /api/todos`) — **delete**, replaced by a single WS endpoint per the hard constraint.
- `models/todos/todo.js`: legacy Todo schema (to be replaced by User, Match, Chat, Message models).
- `utils/helpers/responses.js`: `sendSuccess` / `sendError` — adapt to WS message envelopes.

| Type | Auth | Payload | Server emits |
| --- | --- | --- | --- |
| `register` | no | `{email, password, name, description?, profileEmoji}` | `register:ok {token, user}` |
| `auth` | no | `{token}` or `{email, password}` | `auth:ok {token, user}` |
| `profile:get` | yes | — | `profile {user}` |
| `profile:update` | yes | `{name?, description?, profileEmoji?}` | `profile:updated {user}` |
| `discover:list` | yes | `{limit?}` | `discover:list {profiles}` |
| `swipe` | yes | `{targetId, action: 'like' \| 'pass'}` | `swipe:ok {match?}`; peer gets `match:new` on mutual like |
| `matches:list` | yes | — | `matches:list {matches}` |
| `chat:schedule` | yes | `{matchId, scheduledAt}` | both participants get `chat:scheduled` |
| `chat:join` | yes | `{sessionId}` | `chat:joined`; when 2nd user joins, both get `chat:started {startedAt, expiresAt}` and the 5-min timer starts |
| `chat:message` | yes | `{sessionId, emoji}` (single allowed emoji) | sender + peer get `chat:message {from, emoji, sentAt}` |
| `chat:extend` | yes | `{sessionId}` | both get `chat:extended {expiresAt, extensions}`. Stub "payment" — adds `CHAT_DURATION_MS` (5min), capped at `MAX_EXTENSIONS` (default 3) |
| `chat:end` | yes | `{sessionId}` | both get `chat:ended {chemistry: {score, hits, messageCount}}`. Also fires automatically on expiry |

Errors come back as `{type: 'error', inReplyTo: <originalType>, message}`.

**Date scheduling (post-chat) is intentionally out of scope for this iteration** and will be added later.
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

Two networks connect the services:
- `react-express`: frontend ↔ backend
- `express-mongo`: backend ↔ mongo

Frontend proxies API requests to backend via service hostname `http://backend:3000` (defined in `package.json` proxy). Backend connects to MongoDB via hostname `mongo:27017`. Only frontend's port is bound to the host. Backend (3000) and mongo (27017) are container-internal via compose `expose`.

## Dependencies & Configuration

**Backend:**
- `express`: HTTP server (only used to mount the 426 catch-all; all real traffic is over the WS)
- `mongoose`: MongoDB ODM
- `bcryptjs`: password hashing
- `jsonwebtoken`: JWT issuance / verification (token sent over WS in the `auth` message)
- `validator`, `lodash`: Utilities
- `nodemon`, `prettier`: Dev tools

**Frontend:**
- `react` 17, `react-dom`: UI framework
- `axios`: HTTP client
- `bootstrap`, `sass`: Styling
- `react-scripts` 5: Build tool (Create React App)

**Environment Variables:**
- Backend: `NODE_ENV` (dev/test, default dev), `PORT` (3000), `MONGODB_URI`, `JWT_SECRET`, `CHAT_DURATION_MS` (default 300000 = 5 min), `MAX_EXTENSIONS` (default 3) — all from `config/config.json`
- Frontend: `PORT` (from compose.yaml, defaults 4000), `DANGEROUSLY_DISABLE_HOST_CHECK`, `WDS_SOCKET_PORT`

## Testing

**Frontend:**
```bash
cd frontend
npm test                           # Interactive Jest runner
npm test -- --watchAll=false      # Single run
```
Networks: `react-express` (frontend ↔ backend) and `express-mongo` (backend ↔ mongo). Frontend connects to the backend WebSocket via `ws://backend:3000/ws` (proxied through Vite in dev). Backend connects to Mongo via `mongo:27017`. Only the frontend's port is host-bound; backend (3000) and mongo (27017) are container-internal via compose `expose`.

## Conventions

- Backend formatting: Prettier (`npm run lint` / `npm run format`).
- Frontend: function components with hooks. React 18 `createRoot`. Router wired in [frontend/src/App.jsx](frontend/src/App.jsx).
- Standardized WS responses via `utils/helpers/responses.js` and `config/messages.js`.
- All shipped strings are English (see Hard Constraint #3).
- Hot reload in Docker via volume mounts; no manual restart needed.

1. **WS-only transport**: There is no REST API. Every server interaction is a WS message dispatched through `handlers/index.js`. HTTP requests return 426 by design.
2. **Auth state on the socket**: After `auth` / `register` succeeds the dispatcher attaches `socket.userId`. `AUTHED` handlers are gated on its presence.
3. **Peer routing via in-process Map**: `handlers/state.js` keeps a `userId → socket` map so handlers can address the matched peer directly without broadcasting. A second connection for the same user replaces the first (the first is told `session:replaced`).
4. **Chemistry as a pure function over the message stream**: `utils/chemistry.js` is stateless — `scoreSequence(emojis)` is called once when a session ends, against `Message.find({session}).sort(sentAt)`. Combos are 3-emoji windows, score is the average `match_pct` of all hits.
5. **Timers as side-effects on `setTimeout`**: Each active session has at most one entry in `sessionTimers` that auto-ends it on expiry. `chat:extend` and re-joins reschedule it; `endSession` always clears it.
## Notes

## Notes for Future Development

- "Date" scheduling (post-chat) is **omitted** for now per product decision — add as another handler module when revisiting.
- Auth tokens currently live for 7 days with no refresh / revocation path; revisit if accounts go beyond demo.
- `userSockets` is in-process only — won't survive a restart or scale to multiple backend instances. If we ever run more than one node, swap for Redis pub/sub.
- Frontend (still being rebuilt) must connect to `ws://<host>:3000/ws`, send `auth` first, then any other message type.
- Tests not yet integrated; the chemistry scorer and emoji tokenizer are easy unit-test wins.
- Legacy todo code (`AddTodo`, `TodoList`, `/api/todos`, `Todo` model) is throwaway scaffolding — replace as Matchmoji features land.
- No auth yet despite password-related strings in `messages.js`; registration/login flow needs to be built.
- No backend tests configured.
