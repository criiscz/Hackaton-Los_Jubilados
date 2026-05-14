// Matchmoji API — WebSocket-only transport.
// Two implementations behind one shape:
//   - mockApi    : in-memory demo. No backend required. Default.
//   - realApi    : talks to the backend via a single WS connection at /ws.
//
// Selection: import.meta.env.VITE_USE_MOCK !== 'false'.

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

// ---------- Demo fixtures (convincing, demo-ready) ----------

export const DEMO_PROFILE = {
  id: 'me_demo',
  name: 'You',
  email: 'demo@matchmoji.app',
  interest: 'everyone',
  emoji: '🦄',
  rizz: 78,
};

const CANDIDATES_SEED = [
  { id: 'c1', name: 'Luna',  emoji: '🦋', interest: 'everyone',   rizz: 82, vibe: ['😏', '🔥', '👀'], bio: 'Reads tarot. Burns toast.' },
  { id: 'c2', name: 'Diego', emoji: '🌶️', interest: 'women',      rizz: 67, vibe: ['😉', '🥒', '😘'], bio: 'Hot sauce sommelier.' },
  { id: 'c3', name: 'Mar',   emoji: '🐚', interest: 'non-binary', rizz: 91, vibe: ['🫦', '💋', '🔥'], bio: 'Talks to the sea. It answers.' },
  { id: 'c4', name: 'Inés',  emoji: '🍒', interest: 'men',        rizz: 74, vibe: ['😍', '💦', '😏'], bio: 'Always two espressos in.' },
  { id: 'c5', name: 'Tomás', emoji: '🛸', interest: 'everyone',   rizz: 58, vibe: ['🤔', '👀', '😮'], bio: 'Believes. Sometimes.' },
  { id: 'c6', name: 'Cleo',  emoji: '🪩', interest: 'women',      rizz: 88, vibe: ['🔥', '💋', '😘'], bio: 'Disco ball energy, all week.' },
  { id: 'c7', name: 'Ramón', emoji: '🍑', interest: 'everyone',   rizz: 71, vibe: ['😏', '😉', '🥒'], bio: 'Bakes for revenge.' },
  { id: 'c8', name: 'Sol',   emoji: '🌻', interest: 'women',      rizz: 95, vibe: ['😍', '🫦', '🔥'], bio: 'Sunbeam in human form.' },
  { id: 'c9', name: 'Nico',  emoji: '🐉', interest: 'men',        rizz: 80, vibe: ['🔥', '👀', '😏'], bio: 'Writes poems about pigeons.' },
  { id: 'c10', name: 'Vera', emoji: '🩰', interest: 'everyone',   rizz: 86, vibe: ['🫦', '😘', '💋'], bio: 'Late night, every night.' },
];

const PARTNER_REPLIES = {
  '❤️': ['😍', '😘', '💋'],
  '😍': ['😏', '🔥', '😘'],
  '🔥': ['😏', '🫦', '💦'],
  '😏': ['😉', '👀', '😏'],
  '😘': ['😘', '😍', '💋'],
  '💋': ['😘', '🔥', '🫦'],
  '🥒': ['🫦', '👀', '💦'],
  '🫦': ['💦', '🔥', '😏'],
  '💦': ['🔥', '🫦', '😏'],
  '👀': ['😏', '😉', '👀'],
  '😉': ['😘', '😉', '😏'],
  '🙏': ['🙏', '❤️', '😊'],
  '👋': ['👋', '😉', '😊'],
  '😢': ['🙏', '❤️', '🙏'],
  '😂': ['😂', '😉', '🔥'],
  '🤔': ['😉', '🤔', '👀'],
  '😊': ['😊', '😉', '❤️'],
  '👍': ['😉', '🔥', '😏'],
  '👎': ['🤔', '😢', '😉'],
  '😮': ['😏', '😍', '👀'],
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const partnerReplyFor = (sentEmoji) => pick(PARTNER_REPLIES[sentEmoji] || ['😉', '😏', '🔥']);

// ---------- Mock (demo) API ----------

const jitter = () => 150 + Math.floor(Math.random() * 250);
const delay = (data) => new Promise((res) => setTimeout(() => res(data), jitter()));

const mockState = (() => {
  const candidates = CANDIDATES_SEED.map((c) => ({ ...c }));
  const matches = [];
  const chats = {};

  // Pre-seed two scheduled matches so the stack pill shows on first load.
  const seedScheduled = () => {
    const now = Date.now();
    const m1 = {
      id: 'demo_m1',
      candidate: candidates[2], // Mar
      when: new Date(now + 5 * 60 * 1000).toISOString(),
      status: 'scheduled',
    };
    const m2 = {
      id: 'demo_m2',
      candidate: candidates[5], // Cleo
      when: new Date(now + 3 * 60 * 60 * 1000).toISOString(),
      status: 'scheduled',
    };
    matches.push(m1, m2);
  };
  seedScheduled();

  return { candidates, matches, chats };
})();

const ensureChat = (matchId) => {
  if (!mockState.chats[matchId]) mockState.chats[matchId] = [];
  return mockState.chats[matchId];
};

const partnerListeners = new Map(); // matchId → handler[]

const notifyPartner = (matchId, msg) => {
  ensureChat(matchId).push(msg);
  (partnerListeners.get(matchId) || []).forEach((fn) => fn(msg));
};

export const mockApi = {
  async demoLogin() {
    return delay({ ...DEMO_PROFILE });
  },
  async getCandidates() {
    return delay(mockState.candidates.map((c) => ({ ...c })));
  },
  async getCandidate(id) {
    return delay(mockState.candidates.find((c) => c.id === id) || null);
  },
  async scheduleMatch({ candidateId, when }) {
    const cand = mockState.candidates.find((c) => c.id === candidateId);
    const match = {
      id: `m_${Date.now()}_${candidateId}`,
      candidate: cand,
      when,
      status: 'scheduled',
    };
    mockState.matches.push(match);
    return delay(match);
  },
  async getScheduled() {
    return delay([...mockState.matches]);
  },
  async getMatch(id) {
    return delay(mockState.matches.find((m) => m.id === id) || null);
  },
  async getMessages(matchId) {
    return delay([...ensureChat(matchId)]);
  },
  async sendMessage(matchId, emoji) {
    const msg = { id: `msg_${Date.now()}`, sender: 'me', emoji, at: Date.now() };
    ensureChat(matchId).push(msg);
    // Schedule a scripted partner reply 1.2–2.5s later.
    const ms = 1200 + Math.random() * 1300;
    setTimeout(() => {
      const reply = {
        id: `msg_p_${Date.now()}`,
        sender: 'them',
        emoji: partnerReplyFor(emoji),
        at: Date.now(),
      };
      notifyPartner(matchId, reply);
    }, ms);
    return delay(msg);
  },
  subscribeToChat(matchId, onPartnerMessage) {
    if (!partnerListeners.has(matchId)) partnerListeners.set(matchId, []);
    partnerListeners.get(matchId).push(onPartnerMessage);
    // Initial nudge from the partner ~3s after open.
    const greetingTimer = setTimeout(() => {
      const m = mockState.matches.find((x) => x.id === matchId);
      if (!m) return;
      notifyPartner(matchId, {
        id: `msg_p_intro_${Date.now()}`,
        sender: 'them',
        emoji: '👋',
        at: Date.now(),
      });
    }, 3000);
    return () => {
      const arr = partnerListeners.get(matchId) || [];
      const i = arr.indexOf(onPartnerMessage);
      if (i >= 0) arr.splice(i, 1);
      clearTimeout(greetingTimer);
    };
  },
  async payExtend(matchId) {
    return new Promise((res) =>
      setTimeout(() => res({ ok: true, matchId, extendedAt: Date.now() }), 700),
    );
  },
};

// ---------- Real (WebSocket) API ----------

class WSClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.pending = new Map();
    this.subs = new Map();
    this.queue = [];
    this.cid = 0;
    this.connected = false;
  }

  connect() {
    if (this.ws) return;
    try {
      this.ws = new WebSocket(this.url);
    } catch (err) {
      console.error('[matchmoji] WS init failed', err);
      return;
    }
    this.ws.addEventListener('open', () => {
      this.connected = true;
      this.queue.splice(0).forEach((raw) => this.ws.send(raw));
    });
    this.ws.addEventListener('message', (evt) => this._onMessage(evt.data));
    this.ws.addEventListener('close', () => {
      this.connected = false;
      this.ws = null;
    });
    this.ws.addEventListener('error', () => {
      // surface to pending requests
      this.pending.forEach(({ reject }) => reject(new Error('WS connection error')));
      this.pending.clear();
    });
  }

  _onMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (msg.cid != null && this.pending.has(msg.cid)) {
      const { resolve, reject } = this.pending.get(msg.cid);
      this.pending.delete(msg.cid);
      if (msg.type === 'error') reject(new Error(msg.message || 'WS error'));
      else resolve(msg.data ?? msg);
      return;
    }
    const handlers = this.subs.get(msg.type) || [];
    handlers.forEach((fn) => fn(msg.data ?? msg));
  }

  _rawSend(payload) {
    const raw = JSON.stringify(payload);
    if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(raw);
    } else {
      this.connect();
      this.queue.push(raw);
    }
  }

  request(type, payload) {
    this.connect();
    const cid = ++this.cid;
    return new Promise((resolve, reject) => {
      this.pending.set(cid, { resolve, reject });
      this._rawSend({ type, payload, cid });
      // failsafe timeout
      setTimeout(() => {
        if (this.pending.has(cid)) {
          this.pending.delete(cid);
          reject(new Error(`WS request "${type}" timed out`));
        }
      }, 8000);
    });
  }

  send(type, payload) {
    this.connect();
    this._rawSend({ type, payload });
  }

  subscribe(type, fn) {
    if (!this.subs.has(type)) this.subs.set(type, []);
    this.subs.get(type).push(fn);
    return () => {
      const arr = this.subs.get(type) || [];
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    };
  }
}

const wsUrl = (() => {
  if (typeof window === 'undefined') return 'ws://localhost:3000/ws';
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
})();

const ws = new WSClient(wsUrl);

export const realApi = {
  demoLogin: () => ws.request('demo:login'),
  getCandidates: () => ws.request('candidates:list'),
  getCandidate: (id) => ws.request('candidate:get', { id }),
  scheduleMatch: (body) => ws.request('match:schedule', body),
  getScheduled: () => ws.request('match:list'),
  getMatch: (id) => ws.request('match:get', { id }),
  getMessages: (matchId) => ws.request('chat:history', { matchId }),
  sendMessage: (matchId, emoji) => ws.request('message:send', { matchId, emoji }),
  subscribeToChat(matchId, onPartnerMessage) {
    ws.send('chat:open', { matchId });
    const unsub = ws.subscribe('chat:message', (msg) => {
      if (msg && msg.matchId === matchId && msg.sender !== 'me') onPartnerMessage(msg);
    });
    return () => {
      ws.send('chat:close', { matchId });
      unsub();
    };
  },
  payExtend: (matchId) => ws.request('chat:extend', { matchId }),
};

export const api = USE_MOCK ? mockApi : realApi;
