# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Hackaton-Los_Jubilados** is a React + Node.js + MongoDB todo application. It features:
- React 17 frontend (Create React App) with Bootstrap 5 styling
- Express.js backend serving REST API
- MongoDB database via Mongoose ODM
- Docker Compose orchestration for local development

The application demonstrates a clean separation of concerns with frontend UI handling todo display/input, backend exposing `/api` and `/api/todos` endpoints, and MongoDB persisting todo documents.

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
- Initializes Express app with CORS, body-parser, cookie-parser middleware
- Connects to MongoDB via `db/index.js` (Mongoose with retry logic)
- Registers routes from `routes/index.js`
- Emits "ready" event once DB connected; server listens on port 3000

**Key Files:**
- `config/config.json`: Environment-specific MONGODB_URI and PORT
- `config/messages.js`: Standardized HTTP response messages (200, 400, 401, 403, 404, 422, 500)
- `db/index.js`: Mongoose connection with auto-reconnect (2s retry interval)
- `routes/index.js`: API routes (GET `/api`, POST `/api/todos`)
- `models/todos/todo.js`: Mongoose schema for todo documents (text field required)
- `utils/helpers/responses.js`: Response formatting helpers (sendSuccess, sendError)
- `utils/helpers/logger.js`: Logging utilities
- `.dockerignore`, `Dockerfile`: Development-stage container (runs `npm run dev`)

**API Contract:**
- `GET /api`: Returns all todos (`{success: true, data: [...]}`), uses response helper
- `POST /api/todos`: Creates todo from `{text: "..."}` body, returns created document
- Responses use standardized format from `config/messages.js`

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
- `express`: HTTP server
- `mongoose`: MongoDB ODM with Mongoose connection
- `cors`, `body-parser`, `cookie-parser`: Middleware
- `bcryptjs`, `validator`, `lodash`: Utilities
- `nodemon`, `prettier`: Dev tools

**Frontend:**
- `react` 17, `react-dom`: UI framework
- `axios`: HTTP client
- `bootstrap`, `sass`: Styling
- `react-scripts` 5: Build tool (Create React App)

**Environment Variables:**
- Backend: `NODE_ENV` (dev/test, default dev), `PORT` (3000), `MONGODB_URI` (from config.json)
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

1. **Layered Backend**: Config → Middleware → Routes → Models → DB
2. **Class Components + Axios**: Frontend uses React class components with direct Axios calls (no state management library)
3. **Mongoose ODM**: Single model (Todo) with minimal schema
4. **Standardized Responses**: All API responses use `messages.js` constants for consistency
5. **Hot Reload**: Both frontend and backend support live reload in Docker via volume mounts and nodemon/react-scripts

## Notes for Future Development

- Frontend lacks global state management; prop drilling may become unwieldy as component tree grows
- Backend has minimal error handling beyond message constants; consider adding request validation middleware (e.g., Joi)
- No authentication implemented despite presence of password-related messages in `messages.js`
- Mongoose schema is inline in model file; consider extracting to separate schema file if adding more models
- Tests not yet integrated; consider adding Jest for backend
