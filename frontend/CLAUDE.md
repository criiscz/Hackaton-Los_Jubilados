# Frontend — CLAUDE.md

Guidance for Claude Code when working inside `frontend/`. For the cross-repo overview, see [../CLAUDE.md](../CLAUDE.md).

## Product

**Matchmoji** — emoji-only dating app. The frontend must enforce the emoji-only rule visually and at the input layer: there is no free-text input anywhere in the chat surface.

## Hard Constraints (non-negotiable)

1. **WebSocket-only transport.** No REST, no `fetch`, no `axios`. A single WS client (e.g. `src/api/socket.js`) opens one connection and dispatches typed messages: `{ type, payload, id? }`. The Vite dev server proxies `/ws → ws://backend:3000/ws`. All "API" calls in screens go through the socket dispatcher.
2. **Demo mode is mandatory.** A `?demo=1` query param (or `/demo` route) boots the app with seeded fake data — profiles, matches, an in-progress chat — and a scripted bot that replies with emojis. In demo mode the WS client is replaced by an in-memory mock that simulates server pushes. No registration, no backend, no payment needed. The whole product must be demoable cold.
3. **English only.** All UI copy, microcopy, button labels, placeholders, error messages, and meta tags ship in English. No Spanish strings anywhere — including emoji `label` fields in [src/constants/emojiKeyboard.js](src/constants/emojiKeyboard.js), the `<meta description>` in [index.html](index.html), and current screen drafts. Update existing Spanish copy as you touch each file.

## Stack

- React 18 + Vite 5 (`@vitejs/plugin-react`) with React Fast Refresh / HMR
- Tailwind CSS v4 (`@tailwindcss/vite`) — primary styling layer. SCSS partials under `src/styles/` are kept only for design tokens / mixins / animations.
- WebSocket client (single connection) — no HTTP client library
- `react-router-dom` v6 for routing
- Vitest + `@testing-library/react` for tests
- No state management library yet — local component state + props are fine for the initial three screens. Introduce Context (or Zustand) once auth/session is needed.

## Scripts

```bash
npm install
npm run dev        # Vite dev server with HMR (PORT env var, default 4000)
npm start          # alias of npm run dev
npm run build      # production build to /build
npm run preview    # serve the production build locally
npm test           # Vitest (single run)
npm run test:watch # Vitest watch
```

Dev proxy: `/ws → ws://backend:3000/ws` lives in [vite.config.js](vite.config.js) (set `ws: true` on the proxy entry). For Docker bind mounts on Windows / macOS, Vite is configured with `watch.usePolling: true` so HMR detects file changes.

## Source Layout

```
frontend/
  index.html        # Vite entry (root) — loads /src/main.jsx as a module
  vite.config.js    # Vite + React plugin + dev proxy + polling for Docker
  public/           # static assets served from / (favicon, manifest, logos)
  src/
    main.jsx        # ReactDOM.render entry
    App.jsx         # placeholder shell — replace with router + Matchmoji screens
    api/            # WebSocket client + demo-mode mock socket
    constants/      # emojiKeyboard.js (canonical emoji set)
    components/     # reusable UI (EmojiKeyboard, MatchCard, Countdown, ...)
    screens/        # Register, Feed, Chat
    hooks/          # custom hooks (useCountdown, ...)
    styles/         # design tokens + mixins + animations (SCSS partials)
    __tests__/      # tests (no runner wired yet)
```

## Screens (MVP)

Three screens, in order. Use `react-router-dom` once a second screen lands.

### 1. Registration — `/register`
**Goal:** collect minimum profile in under 30 seconds.

Fields:
- **Name** — text input, required.
- **Email** — email input, required, basic format validation.
- **Interest / preference** — short text or chip selector (e.g. "men", "women", "everyone", "non-binary"). Pick one.
- **Signature emoji** — single emoji picker. This is the user's identity on the feed.

UX rules:
- Single-screen flow, no multi-step wizard.
- Big primary CTA at the bottom ("Start matching").
- Validation inline, never blocking with modals.
- Signature emoji is mandatory — without it, the user has no identity.

### 2. Main feed — `/`
**Goal:** evaluate one candidate at a time, decide match / no match.

Card content:
- Candidate's signature emoji (large, centered).
- Name + interest.
- Optional secondary info: labia rating (charisma badge), recent emoji "vibe" preview.

Actions:
- **Match** — primary affirmative action (right side / green / heart-emoji button).
- **No match** — dismiss (left side / red / cross-emoji button).
- Optional: swipe gestures mirroring the buttons.

On match:
- Open a time-picker modal to schedule the 2-minute chat with the other user.
- Surface a "scheduled" state in the feed for matches awaiting confirmation.

### 3. Chat — `/chat/:matchId`
**Goal:** 2-minute emoji-only conversation with a clear timer and a payment escape hatch.

Layout:
- **Header**: other user's signature emoji + name + countdown timer (mm:ss). Timer is the visual anchor — make it impossible to miss.
- **Message list**: emoji bubbles, sender on the right, recipient on the left. No avatars beyond signature emoji. No text at all.
- **Emoji keyboard**: fixed bottom panel, 10–20 emojis, grid layout, large tap targets. Tap = send immediately (no compose-then-send step). This is the only input affordance in the entire screen.

Strict rules:
- **No text input anywhere.** No letters, numbers, or symbols may be typed or pasted. The keyboard is the only way to produce messages.
- Timer counts down from 120s. At 0, input disables and a "Extend for $X" CTA replaces the keyboard.
- Payment success re-enables input and resets/extends the timer. Failure surfaces inline.

## UX Principles

- **Emoji is the language.** Every screen leans on emoji as content, identity, and feedback. Use emoji in microcopy where natural.
- **Big, thumb-reachable targets.** Mobile-first. Primary actions in the bottom third of the screen.
- **Timer is sacred.** The chat countdown must always be visible and legible — never collapse it into a small corner indicator.
- **No dead ends.** When the chat expires, the next action (pay to extend, or exit gracefully) must be obvious within one tap.
- **Optimistic UI.** Emoji sends should appear in the bubble list immediately; reconcile with server confirmation in the background.

## Implementation Notes

- Router is wired in [src/App.jsx](src/App.jsx) (Register / Feed / Chat). Implement each screen progressively.
- Use function components with hooks (`useState`, `useEffect`) — React 18 `createRoot` in [src/main.jsx](src/main.jsx).
- Emoji set is centralized in [src/constants/emojiKeyboard.js](src/constants/emojiKeyboard.js) — keyboard, input validation, and analytics MUST import from there. Two groups of 10:
  - **Safe (10):** 😊 happy · 😂 laughing · 🤔 thinking · 👍 yes · 👎 no · ❤️ love · 😢 sad · 😮 wow · 🙏 please/thanks · 👋 hi/bye
  - **Spicy (10):** 😏 smirk · 😉 wink · 😘 kiss · 🥒 cucumber · 😍 heart-eyes · 🔥 fire · 💋 kiss-mark · 👀 eyes · 🫦 biting-lip · 💦 droplets
  - Use `isAllowedEmoji()` to reject anything outside this set.
- Timer logic: use a single `setInterval` on chat mount, clear on unmount, derive remaining seconds from `startedAt + duration - now()` to survive re-renders.
- All server communication goes through a single WS client in `src/api/socket.js`. Expose hooks like `useSocket()` / `useSocketEvent(type, handler)` so components never touch the raw `WebSocket`. The same module exports a `MockSocket` used by demo mode (selected at boot from `?demo=1`).
- Accessibility: emojis are not self-descriptive — provide `aria-label`s ("send heart", "send fire") on every keyboard button.

## Demo Mode

- Entry: `?demo=1` query param OR `/demo` route. Persist the flag in `sessionStorage` so route changes don't drop it.
- Boot path: at app init, inspect the flag and select either the real `WSClient` or the `MockSocket`. The rest of the app is agnostic.
- Seed data lives in `src/api/demoData.js` — 6–10 believable profiles (English names, varied signature emojis, varied labia ratings), 1–2 pending matches, 1 active chat with a scripted counterpart.
- The mock bot replies on the same WS contract: after the user sends an emoji, schedule a `chat:msg` push 800–1800 ms later from a small reply-script keyed off the user's emoji.
- Demo mode must work fully offline (no backend, no network).

## Testing

- Vitest + `@testing-library/react` are wired (`npm test`, `npm run test:watch`). Setup file: [src/__tests__/setup.js](src/__tests__/setup.js).
- Prioritize tests for: emoji-only input enforcement, timer countdown behavior, payment-gated chat extension, demo-mode boot path.

## Env Vars

Vite exposes vars prefixed with `VITE_` via `import.meta.env.VITE_*`. The CRA `process.env.REACT_APP_*` convention no longer works — rename any such vars.
