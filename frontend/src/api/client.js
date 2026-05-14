// Matchmoji API — WebSocket-only transport. No mocks: everything the app
// displays comes from the backend over /ws.
//
// Backend protocol:
//   client → server
//     {type:"register",      payload:{email,password,name,description,profileEmoji}}
//     {type:"swipe",         payload:{targetId, action}}
//     {type:"chat:schedule", payload:{matchId, scheduledAt}}
//     {type:"chat:join",     payload:{sessionId}}
//     {type:"chat:message",  payload:{sessionId, emoji}}
//     {type:"chat:extend",   payload:{sessionId}}
//
//   server → client (observed types — exact set depends on the backend)
//     {type:"hello",          ...}
//     {type:"register:ok",    token, user:{id, ...}}
//     {type:"register:err",   message}
//     {type:"swipe:ok",       ...}
//     {type:"match",          match:{matchId, ...}}
//     {type:"chat:scheduled", sessionId, matchId, scheduledAt}
//     {type:"chat:started",   sessionId, expiresAt}
//     {type:"chat:message",   sessionId, emoji, sender, at}
//     {type:"chat:extended",  sessionId, expiresAt}
//     {type:"chat:expired",   sessionId}
//     {type:"error",          message}
//
// Candidate discovery is best-effort: we probe for a feed/user list and also
// passively harvest any user-like objects from inbound frames (e.g. hello.users
// or register:ok.feed). If the backend doesn't expose anyone, Feed shows an
// empty state and a "paste a user id" affordance so two tabs can test by
// swapping IDs.

const inBrowser = typeof window !== 'undefined' && typeof WebSocket !== 'undefined';

// Anything that displays "info" comes from the backend now. The flag exists
// purely so tests can opt back into a deterministic mock if they want to.
const USE_MOCK =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_USE_MOCK === 'true'
    : false;

// ---------- Connection-status observable ----------

let connectionStatus = 'idle';
let connectionUrl = null;
let lastFrameAt = null;
const statusListeners = new Set();

const setStatus = (s, extras = {}) => {
  connectionStatus = s;
  if (extras.url !== undefined) connectionUrl = extras.url;
  if (extras.frame !== undefined) lastFrameAt = extras.frame;
  const snap = { status: connectionStatus, url: connectionUrl, lastPongAt: lastFrameAt };
  statusListeners.forEach((fn) => fn(snap));
};

export const subscribeConnection = (fn) => {
  statusListeners.add(fn);
  fn({ status: connectionStatus, url: connectionUrl, lastPongAt: lastFrameAt });
  return () => statusListeners.delete(fn);
};

export const getConnection = () => ({
  status: connectionStatus,
  url: connectionUrl,
  lastPongAt: lastFrameAt,
});

// ---------- WS URL ----------

const wsUrl = (() => {
  const explicit = inBrowser && import.meta.env && import.meta.env.VITE_WS_URL;
  if (explicit) return explicit;
  if (!inBrowser) return 'ws://localhost:3000/ws';
  const host =
    (import.meta.env && import.meta.env.VITE_WS_HOST) || window.location.hostname || 'localhost';
  const port = (import.meta.env && import.meta.env.VITE_WS_PORT) || '3000';
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${host}:${port}/ws`;
})();

// ---------- WSClient ----------

class WSClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.queue = [];
    this.subs = new Map();
    this.allFrameSubs = new Set();
    this.connected = false;
    this.retry = null;
    this.attempts = 0;
  }

  connect() {
    if (!inBrowser) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    try {
      setStatus('connecting', { url: this.url });
      this.ws = new WebSocket(this.url);
    } catch (err) {
      setStatus('error', { url: this.url });
      this.scheduleRetry();
      return;
    }
    this.ws.addEventListener('open', () => {
      this.connected = true;
      this.attempts = 0;
      setStatus('open', { url: this.url });
      this.queue.splice(0).forEach((raw) => this.ws.send(raw));
    });
    this.ws.addEventListener('message', (evt) => this._onMessage(evt.data));
    this.ws.addEventListener('close', () => {
      this.connected = false;
      this.ws = null;
      setStatus('closed', { url: this.url });
      this.scheduleRetry();
    });
    this.ws.addEventListener('error', () => setStatus('error', { url: this.url }));
  }

  scheduleRetry() {
    if (this.retry) return;
    this.attempts += 1;
    const wait = Math.min(15000, 1000 * Math.pow(1.6, this.attempts));
    this.retry = setTimeout(() => {
      this.retry = null;
      this.connect();
    }, wait);
  }

  _onMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    setStatus(connectionStatus, { frame: Date.now() });
    this.allFrameSubs.forEach((fn) => fn(msg));
    const handlers = this.subs.get(msg.type);
    if (handlers) handlers.forEach((fn) => fn(msg));
  }

  send(type, payload) {
    const raw = JSON.stringify({ type, payload });
    if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(raw);
    } else {
      this.queue.push(raw);
      this.connect();
    }
  }

  subscribe(type, fn) {
    if (!this.subs.has(type)) this.subs.set(type, new Set());
    this.subs.get(type).add(fn);
    return () => this.subs.get(type) && this.subs.get(type).delete(fn);
  }

  subscribeAll(fn) {
    this.allFrameSubs.add(fn);
    return () => this.allFrameSubs.delete(fn);
  }
}

export const ws = new WSClient(wsUrl);
if (inBrowser) ws.connect();

// ---------- Auth / session state ----------

let session = (() => {
  if (!inBrowser) return { token: null, userId: null, user: null };
  try {
    const raw = sessionStorage.getItem('matchmoji:session');
    if (raw) return JSON.parse(raw);
  } catch {}
  return { token: null, userId: null, user: null };
})();

const persistSession = () => {
  if (!inBrowser) return;
  try {
    sessionStorage.setItem('matchmoji:session', JSON.stringify(session));
  } catch {}
};

export const getAuth = () => ({ ...session });

export const clearAuth = () => {
  session = { token: null, userId: null, user: null };
  if (inBrowser) {
    try {
      sessionStorage.removeItem('matchmoji:session');
    } catch {}
  }
  // The discovery loop is anchored to an authed session — kill it on signout.
  // (stopCandidateSearch is defined below; this fn is exported only for use at
  // runtime, so the temporal-dead-zone is not an issue.)
  if (typeof stopCandidateSearch === 'function') stopCandidateSearch();
};

// ---------- Typed protocol helpers ----------

export const wsApi = {};

wsApi.register = async ({ email, password, name, description, profileEmoji }) => {
  const pending = new Promise((resolve, reject) => {
    const unsubOk = ws.subscribe('register:ok', (m) => {
      unsubOk();
      unsubErr();
      clearTimeout(to);
      resolve(m);
    });
    const unsubErr = ws.subscribe('register:err', (m) => {
      unsubOk();
      unsubErr();
      clearTimeout(to);
      reject(new Error(m.message || 'register failed'));
    });
    const to = setTimeout(() => {
      unsubOk();
      unsubErr();
      reject(new Error('register timed out'));
    }, 8000);
  });
  ws.send('register', { email, password, name, description, profileEmoji });
  const ok = await pending;
  session = {
    token: ok.token,
    userId: ok.user?.id || ok.user?._id,
    user: ok.user,
  };
  persistSession();
  return ok;
};

wsApi.swipe = ({ targetId, action = 'like' }) =>
  ws.send('swipe', { targetId, action });

wsApi.scheduleChat = ({ matchId, scheduledAt }) =>
  ws.send('chat:schedule', { matchId, scheduledAt });

wsApi.joinChat = ({ sessionId }) => ws.send('chat:join', { sessionId });

wsApi.sendChatMessage = ({ sessionId, emoji }) =>
  ws.send('chat:message', { sessionId, emoji });

wsApi.extendChat = ({ sessionId }) => ws.send('chat:extend', { sessionId });

wsApi.onEvent = (type, fn) => ws.subscribe(type, fn);
wsApi.onAny = (fn) => ws.subscribeAll(fn);

// ---------- Backend state (live, no mocks) ----------

const state = {
  candidatesById: new Map(),        // userId → candidate
  matchesById: new Map(),           // matchId → match record
  matchToSession: new Map(),
  sessionToMatch: new Map(),
  sessionExpiresAt: new Map(),
  chatMessagesByMatch: new Map(),   // matchId → message[]
  chatListeners: new Map(),         // matchId → Set<fn>
  candidateListeners: new Set(),
  scheduledListeners: new Set(),
};

const notifyCandidates = () =>
  state.candidateListeners.forEach((fn) => fn(Array.from(state.candidatesById.values())));
const notifyScheduled = () =>
  state.scheduledListeners.forEach((fn) => fn(Array.from(state.matchesById.values())));

const looksLikeUser = (x) =>
  x &&
  typeof x === 'object' &&
  (x.id || x._id) &&
  (x.name || x.profileEmoji || x.email);

const normalizeUser = (u) => {
  const id = u.id || u._id;
  if (!id || id === session.userId) return null;
  return {
    id,
    name: u.name || u.email || 'Stranger',
    email: u.email || null,
    emoji: u.profileEmoji || u.emoji || '✨',
    interest: u.interest || 'everyone',
    rizz: typeof u.rizz === 'number' ? u.rizz : 70,
    vibe: u.vibe || [],
    bio: u.description || u.bio || '',
  };
};

const upsertCandidate = (u) => {
  const norm = normalizeUser(u);
  if (!norm) return;
  state.candidatesById.set(norm.id, norm);
};

const harvestUsers = (val) => {
  if (!val) return;
  if (Array.isArray(val)) {
    val.forEach((u) => {
      if (looksLikeUser(u)) upsertCandidate(u);
    });
    return;
  }
  if (typeof val === 'object') {
    Object.values(val).forEach((v) => harvestUsers(v));
  }
};

// Probe the backend for any directory-style list. Harmless if unsupported.
const probeDiscovery = () => {
  if (!session.userId) return;
  ['users:list', 'feed:list', 'candidates:list', 'users', 'feed'].forEach((t) => ws.send(t));
};

// Continuous candidate search — runs while the user is signed in. Hammers
// every known discovery message type every few seconds so newly-registered
// users in other tabs surface here without a manual refresh.
const SEARCH_INTERVAL_MS = 4000;
let searchTimer = null;
let searching = false;
const searchListeners = new Set();

const setSearching = (v) => {
  if (searching === v) return;
  searching = v;
  searchListeners.forEach((fn) => fn(searching));
};

export const subscribeSearching = (fn) => {
  searchListeners.add(fn);
  fn(searching);
  return () => searchListeners.delete(fn);
};

export const isSearching = () => searching;

const startCandidateSearch = () => {
  if (searchTimer) return;
  setSearching(true);
  probeDiscovery();
  searchTimer = setInterval(() => {
    if (!session.userId) {
      stopCandidateSearch();
      return;
    }
    probeDiscovery();
  }, SEARCH_INTERVAL_MS);
};

const stopCandidateSearch = () => {
  if (searchTimer) {
    clearInterval(searchTimer);
    searchTimer = null;
  }
  setSearching(false);
};

// Kick the search whenever the session lands (e.g. after page reload restored
// the token, or after register:ok writes it).
if (inBrowser && session.userId) startCandidateSearch();

// Sweep every inbound frame for user-like arrays and capture them.
ws.subscribeAll((m) => {
  if (!m || typeof m !== 'object') return;
  ['users', 'feed', 'candidates', 'list', 'data', 'items'].forEach((k) => {
    if (m[k]) {
      const before = state.candidatesById.size;
      harvestUsers(m[k]);
      if (state.candidatesById.size !== before) notifyCandidates();
    }
  });
});

ws.subscribe('register:ok', (m) => {
  // Backend may include a feed array alongside the user record.
  if (m.feed) {
    harvestUsers(m.feed);
    notifyCandidates();
  }
  startCandidateSearch();
});

ws.subscribe('hello', (m) => {
  if (m.users) harvestUsers(m.users);
  if (m.feed) harvestUsers(m.feed);
  notifyCandidates();
});

// Reconnect → resume continuous search.
subscribeConnection(({ status }) => {
  if (status === 'open' && session.userId) startCandidateSearch();
  else if (status === 'closed' || status === 'error') stopCandidateSearch();
});

const newMatchListeners = new Set();
const notifyNewMatch = (record) => newMatchListeners.forEach((fn) => fn(record));

// Match event → add to scheduled list (as a pending match awaiting schedule).
ws.subscribe('match', (m) => {
  const match = m.match || m;
  const matchId = match.matchId || match.id;
  if (!matchId) return;
  // Try to attach a candidate record we already know about.
  const otherId = match.users?.find?.((u) => u !== session.userId) || match.targetId;
  const candidate =
    (otherId && state.candidatesById.get(otherId)) ||
    normalizeUser(match.target || match.user || {}) ||
    {
      id: otherId || matchId,
      name: 'Match',
      emoji: '✨',
      interest: 'everyone',
      rizz: 70,
      vibe: [],
      bio: '',
    };
  const fresh = !state.matchesById.has(matchId);
  const record = {
    id: matchId,
    candidate,
    when: null,
    status: 'matched',
  };
  state.matchesById.set(matchId, record);
  notifyScheduled();
  if (fresh) notifyNewMatch(record);
});

ws.subscribe('chat:scheduled', (m) => {
  const matchId = m.matchId;
  const sessionId = m.sessionId;
  if (matchId && sessionId) {
    state.matchToSession.set(matchId, sessionId);
    state.sessionToMatch.set(sessionId, matchId);
  }
  if (matchId && state.matchesById.has(matchId)) {
    const existing = state.matchesById.get(matchId);
    state.matchesById.set(matchId, {
      ...existing,
      when: m.scheduledAt || existing.when,
      sessionId,
      status: 'scheduled',
    });
  } else if (sessionId) {
    state.matchesById.set(matchId || sessionId, {
      id: matchId || sessionId,
      candidate: { id: 'unknown', name: 'Match', emoji: '✨', rizz: 70 },
      when: m.scheduledAt || null,
      sessionId,
      status: 'scheduled',
    });
  }
  notifyScheduled();
});

ws.subscribe('chat:started', (m) => {
  const sid = m.sessionId;
  if (m.expiresAt) state.sessionExpiresAt.set(sid, m.expiresAt);
});

ws.subscribe('chat:extended', (m) => {
  if (m.sessionId && m.expiresAt) state.sessionExpiresAt.set(m.sessionId, m.expiresAt);
});

ws.subscribe('chat:expired', (m) => {
  if (m.sessionId) state.sessionExpiresAt.delete(m.sessionId);
});

// Extract a sender id whether the backend serializes it as a string, a Mongo
// ObjectId, or a nested user object.
const extractSenderId = (m) => {
  const raw = m.sender ?? m.userId ?? m.from ?? null;
  if (!raw) return null;
  if (typeof raw === 'object') return raw.id || raw._id || null;
  return raw;
};

ws.subscribe('chat:message', (m) => {
  const sid = m.sessionId || m.session;
  if (!sid) return;

  const senderId = extractSenderId(m);
  const mine = senderId && String(senderId) === String(session.userId);
  const msg = {
    id: m.id || m._id || `srv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    sender: mine ? 'me' : 'them',
    emoji: m.emoji,
    at: m.at || Date.now(),
  };

  // The UI may have subscribed under EITHER the backend matchId or the
  // sessionId itself (depending on which the scheduled list surfaced). Build
  // every key that could possibly point at this chat and dispatch to all of
  // them. Same idea for the persisted message log.
  const keys = new Set([sid]);
  state.matchToSession.forEach((s, mid) => {
    if (s === sid) keys.add(mid);
  });

  keys.forEach((k) => {
    if (!state.chatMessagesByMatch.has(k)) state.chatMessagesByMatch.set(k, []);
    state.chatMessagesByMatch.get(k).push(msg);
    if (!mine) {
      (state.chatListeners.get(k) || []).forEach((fn) => fn(msg));
    }
  });
});

// ---------- Public API ----------

export const realApi = {
  async demoLogin() {
    throw new Error('Demo bypass is disabled — register first.');
  },

  async getCandidates() {
    probeDiscovery();
    return Array.from(state.candidatesById.values());
  },

  subscribeCandidates(fn) {
    state.candidateListeners.add(fn);
    fn(Array.from(state.candidatesById.values()));
    return () => state.candidateListeners.delete(fn);
  },

  /**
   * Manually inject a candidate identified by their backend user id. Useful
   * when cross-testing between two tabs — the backend protocol doesn't yet
   * expose a directory, so you paste the other tab's `register:ok` user.id.
   */
  addCandidateById(id, fallbackName) {
    if (!id || id === session.userId) return;
    if (state.candidatesById.has(id)) return;
    state.candidatesById.set(id, {
      id,
      name: fallbackName || `User ${String(id).slice(-6)}`,
      emoji: '🫥',
      interest: 'unknown',
      rizz: 70,
      vibe: [],
      bio: 'added by id — swipe to wake them up.',
    });
    notifyCandidates();
  },

  async getCandidate(id) {
    return state.candidatesById.get(id) || null;
  },

  async scheduleMatch({ candidateId, when }) {
    // Step 1: swipe like.
    wsApi.swipe({ targetId: candidateId, action: 'like' });

    const iso = typeof when === 'string' ? when : when?.toISOString?.() || new Date().toISOString();

    // Step 2: wait briefly for a `match` from the backend so we have a matchId
    // to schedule. If the other side hasn't liked us yet, we surface a
    // "pending" record locally so the UI can show the swipe registered.
    const matchId = await new Promise((resolve) => {
      const to = setTimeout(() => {
        unsub();
        resolve(null);
      }, 1200);
      const unsub = ws.subscribe('match', (m) => {
        const mm = m.match || m;
        const id = mm.matchId || mm.id;
        if (id) {
          clearTimeout(to);
          unsub();
          resolve(id);
        }
      });
    });

    if (matchId) {
      wsApi.scheduleChat({ matchId, scheduledAt: iso });
      return state.matchesById.get(matchId) || {
        id: matchId,
        candidate: state.candidatesById.get(candidateId) || null,
        when: iso,
        status: 'scheduled',
      };
    }

    // No mutual like yet — record a pending entry locally so the user sees
    // their swipe didn't disappear. Not persisted; backend is the truth.
    const pendingId = `pending_${candidateId}_${Date.now()}`;
    const pending = {
      id: pendingId,
      candidate: state.candidatesById.get(candidateId) || null,
      when: iso,
      status: 'pending',
    };
    state.matchesById.set(pendingId, pending);
    notifyScheduled();
    return pending;
  },

  async getScheduled() {
    return Array.from(state.matchesById.values());
  },

  subscribeScheduled(fn) {
    state.scheduledListeners.add(fn);
    fn(Array.from(state.matchesById.values()));
    return () => state.scheduledListeners.delete(fn);
  },

  async getMatch(id) {
    if (state.matchesById.has(id)) return state.matchesById.get(id);
    // id may actually be a sessionId — look up the bound matchId and return it.
    const matchId = state.sessionToMatch.get(id);
    if (matchId && state.matchesById.has(matchId)) return state.matchesById.get(matchId);
    return null;
  },

  async getMessages(matchId) {
    return [...(state.chatMessagesByMatch.get(matchId) || [])];
  },

  async sendMessage(chatKey, emoji) {
    // chatKey may be a matchId mapped to a session, or already be a sessionId.
    const sessionId = state.matchToSession.get(chatKey) || chatKey;
    const local = {
      id: `local_${Date.now()}`,
      sender: 'me',
      emoji,
      at: Date.now(),
      pending: true,
    };
    if (!state.chatMessagesByMatch.has(chatKey)) state.chatMessagesByMatch.set(chatKey, []);
    state.chatMessagesByMatch.get(chatKey).push(local);
    wsApi.sendChatMessage({ sessionId, emoji });
    return local;
  },

  subscribeToChat(chatKey, onPartnerMessage) {
    if (!state.chatListeners.has(chatKey)) state.chatListeners.set(chatKey, new Set());
    state.chatListeners.get(chatKey).add(onPartnerMessage);
    const sessionId = state.matchToSession.get(chatKey) || chatKey;
    wsApi.joinChat({ sessionId });
    return () => {
      state.chatListeners.get(chatKey)?.delete(onPartnerMessage);
    };
  },

  async payExtend(chatKey) {
    const sessionId = state.matchToSession.get(chatKey) || chatKey;
    wsApi.extendChat({ sessionId });
    return { ok: true, matchId: chatKey, extendedAt: Date.now() };
  },
};

// ---------- Mock surface (test-only) ----------

const mockApi = {
  async demoLogin() {
    return { id: 'me_test', name: 'Tester', emoji: '🧪', interest: 'everyone', rizz: 50 };
  },
  async getCandidates() {
    return [];
  },
  subscribeCandidates(fn) {
    fn([]);
    return () => {};
  },
  addCandidateById() {},
  async getCandidate() {
    return null;
  },
  async scheduleMatch() {
    return { id: 'test_match', candidate: null, when: null, status: 'pending' };
  },
  async getScheduled() {
    return [];
  },
  subscribeScheduled(fn) {
    fn([]);
    return () => {};
  },
  async getMatch(id) {
    return {
      id,
      candidate: { id: 'c_test', name: 'Tester', emoji: '🧪', interest: 'everyone', rizz: 50 },
      when: new Date().toISOString(),
      status: 'scheduled',
    };
  },
  async getMessages() {
    return [];
  },
  async sendMessage(matchId, emoji) {
    return { id: `local_${Date.now()}`, sender: 'me', emoji, at: Date.now() };
  },
  subscribeToChat() {
    return () => {};
  },
  async payExtend() {
    return { ok: true };
  },
};

export { mockApi };

export const api = USE_MOCK ? mockApi : realApi;
