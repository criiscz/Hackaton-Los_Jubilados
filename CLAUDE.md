# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Hackaton-Los_Jubilados** is an emoji-only dating app built on React + Node.js + MongoDB. It features:
- React 17 frontend (Create React App) with Bootstrap 5 styling
- Express.js process that serves **only a WebSocket** at `/ws` (HTTP routes are intentionally disabled — all non-WS requests return `426 Upgrade Required`)
- MongoDB database via Mongoose ODM
- Docker Compose orchestration for local development

Users register with one of 20 allowed emojis as a profile photo, a name, and a description. Mutual likes create a match; matched users schedule a chat window where they can only send those 20 emojis for **5 minutes** (extendable). After the chat ends, a **chemistry score** is computed from the message stream by sliding a window of 3 emojis over both users' combined chronological sequence and averaging the `match_pct` of every CSV-defined combo that hits (see `backend/chemestry/emoji_chemistry_combinations.csv`).

> **WebSocket transport note** — The raw WebSocket implementation (custom RFC 6455 framing, `/ws` upgrade, masking, etc.) is already implemented in `backend/websocket.js` and `backend/utils/ws.js`. **Do not reimplement the transport or framing.** Add new features by registering handlers in `backend/handlers/index.js`.

## Quick Start

### Development with Docker Compose

```bash
docker compose up -d
```

This starts three services:
- **frontend**: React dev server on `http://localhost:4000` (configurable via `FRONTEND_PORT` env var, defaults to 4000)
- **backend**: Express server on `http://backend:3000` (internal), exposed via frontend proxy
- **mongo**: MongoDB reachable only inside compose network (no host port binding)

All services have hot-reload via volume mounts. Logs available via `docker compose logs -f <service>`.

Stop and clean up:
```bash
docker compose down
```

### Local Development (without Docker)

**Backend:**
```bash
cd backend
npm install
npm run dev          # Start with nodemon (watches file changes)
npm start            # Start production server
npm run lint         # Check code formatting with Prettier
npm run format       # Auto-format code with Prettier
```

**Frontend:**
```bash
cd frontend
npm install
npm start            # Start on PORT 3000 (configurable)
npm test             # Run Jest tests
npm run build        # Production build to /build
```

Backend defaults to port 3000; frontend CRA also defaults to 3000 — set `PORT` to avoid collision when running both locally without Docker. Update frontend's `package.json` proxy if backend runs elsewhere.

## Architecture

### Backend Structure (`backend/`)

**Entry Point:** `server.js`
- Loads config from `config/config.js` (sets env vars from `config/config.json` based on `NODE_ENV`)
- Creates an HTTP server that mounts a catch-all 426 handler on every HTTP path and a WebSocket upgrade handler at `/ws`
- Connects to MongoDB via `db/index.js` (Mongoose with retry logic)
- Emits "ready" event once DB connected; server listens on port 3000

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

### Frontend Structure (`frontend/src/`)

**Entry:** `index.js` → `App.js`

**App.js** (class component):
- State: `{todos: []}`
- Lifecycle: `componentDidMount()` fetches todos via `GET /api`
- Methods: `handleAddTodo(value)` posts to `POST /api/todos`, updates local state
- UI: Bootstrap grid layout with `<AddTodo>` and `<TodoList>` subcomponents

**Components:**
- `AddTodo.js`: Form with text input, validates non-empty, calls parent handler
- `TodoList.js`: Renders todo list from props

**Build Setup:**
- React Scripts 5.0.0 (Create React App)
- Proxy: `http://backend:3000` (in `package.json`, routes API calls to backend)
- Styles: SCSS (custom.scss, App.scss, index.css) + Bootstrap 5
- HTTP Client: Axios

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

**Backend:** No test suite configured currently. Tests can be added via Jest or Mocha.

## Key Architectural Patterns

1. **WS-only transport**: There is no REST API. Every server interaction is a WS message dispatched through `handlers/index.js`. HTTP requests return 426 by design.
2. **Auth state on the socket**: After `auth` / `register` succeeds the dispatcher attaches `socket.userId`. `AUTHED` handlers are gated on its presence.
3. **Peer routing via in-process Map**: `handlers/state.js` keeps a `userId → socket` map so handlers can address the matched peer directly without broadcasting. A second connection for the same user replaces the first (the first is told `session:replaced`).
4. **Chemistry as a pure function over the message stream**: `utils/chemistry.js` is stateless — `scoreSequence(emojis)` is called once when a session ends, against `Message.find({session}).sort(sentAt)`. Combos are 3-emoji windows, score is the average `match_pct` of all hits.
5. **Timers as side-effects on `setTimeout`**: Each active session has at most one entry in `sessionTimers` that auto-ends it on expiry. `chat:extend` and re-joins reschedule it; `endSession` always clears it.

## Notes for Future Development

- "Date" scheduling (post-chat) is **omitted** for now per product decision — add as another handler module when revisiting.
- Auth tokens currently live for 7 days with no refresh / revocation path; revisit if accounts go beyond demo.
- `userSockets` is in-process only — won't survive a restart or scale to multiple backend instances. If we ever run more than one node, swap for Redis pub/sub.
- Frontend (still being rebuilt) must connect to `ws://<host>:3000/ws`, send `auth` first, then any other message type.
- Tests not yet integrated; the chemistry scorer and emoji tokenizer are easy unit-test wins.
