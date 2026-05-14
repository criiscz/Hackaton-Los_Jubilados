import axios from 'axios';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

const jitter = () => 150 + Math.floor(Math.random() * 250);
const delay = (data) => new Promise((res) => setTimeout(() => res(data), jitter()));

// Fixture candidates — varied emoji, names, interests, labia 0-100.
const CANDIDATES = [
  { id: 'c1', name: 'Luna',    emoji: '🦋', interest: 'todes',      labia: 82, vibe: ['😏', '🔥', '👀'] },
  { id: 'c2', name: 'Diego',   emoji: '🌶️', interest: 'mujeres',    labia: 67, vibe: ['😉', '🥒', '😘'] },
  { id: 'c3', name: 'Mar',     emoji: '🐚', interest: 'no-binarie', labia: 91, vibe: ['🫦', '💋', '🔥'] },
  { id: 'c4', name: 'Inés',    emoji: '🍒', interest: 'hombres',    labia: 74, vibe: ['😍', '💦', '😏'] },
  { id: 'c5', name: 'Tomás',   emoji: '🛸', interest: 'todes',      labia: 58, vibe: ['🤔', '👀', '😮'] },
  { id: 'c6', name: 'Cleo',    emoji: '🪩', interest: 'mujeres',    labia: 88, vibe: ['🔥', '💋', '😘'] },
  { id: 'c7', name: 'Ramón',   emoji: '🍑', interest: 'todes',      labia: 71, vibe: ['😏', '😉', '🥒'] },
  { id: 'c8', name: 'Sol',     emoji: '🌻', interest: 'mujeres',    labia: 95, vibe: ['😍', '🫦', '🔥'] },
];

const MATCHES = [];
const SCHEDULED = [];
const CHATS = {};

const seedChat = (matchId) => {
  if (!CHATS[matchId]) CHATS[matchId] = [];
};

export const mockApi = {
  getCandidates: () => delay([...CANDIDATES]),
  getCandidate: (id) => delay(CANDIDATES.find((c) => c.id === id) || null),
  scheduleMatch: ({ candidateId, when }) => {
    const cand = CANDIDATES.find((c) => c.id === candidateId);
    const match = {
      id: `m_${Date.now()}_${candidateId}`,
      candidate: cand,
      when,
      status: 'scheduled',
    };
    MATCHES.push(match);
    SCHEDULED.push(match);
    return delay(match);
  },
  getScheduled: () => delay([...SCHEDULED]),
  getMatch: (id) => delay(MATCHES.find((m) => m.id === id) || null),
  getMessages: (matchId) => {
    seedChat(matchId);
    return delay([...CHATS[matchId]]);
  },
  sendMessage: (matchId, emoji) => {
    seedChat(matchId);
    const msg = { id: `msg_${Date.now()}`, sender: 'me', emoji, at: Date.now() };
    CHATS[matchId].push(msg);
    return delay(msg);
  },
  receivePartnerMessage: (matchId, emoji) => {
    seedChat(matchId);
    const msg = { id: `msg_${Date.now()}_p`, sender: 'them', emoji, at: Date.now() };
    CHATS[matchId].push(msg);
    return msg;
  },
  payExtend: (matchId) =>
    new Promise((res) => setTimeout(() => res({ ok: true, matchId, extendedAt: Date.now() }), 700)),
};

const realApi = {
  getCandidates: () => axios.get('/api/candidates').then((r) => r.data),
  getCandidate: (id) => axios.get(`/api/candidates/${id}`).then((r) => r.data),
  scheduleMatch: (body) => axios.post('/api/matches', body).then((r) => r.data),
  getScheduled: () => axios.get('/api/matches?status=scheduled').then((r) => r.data),
  getMatch: (id) => axios.get(`/api/matches/${id}`).then((r) => r.data),
  getMessages: (matchId) => axios.get(`/api/matches/${matchId}/messages`).then((r) => r.data),
  sendMessage: (matchId, emoji) =>
    axios.post(`/api/matches/${matchId}/messages`, { emoji }).then((r) => r.data),
  payExtend: (matchId) =>
    axios.post(`/api/matches/${matchId}/extend`, { amount: 99 }).then((r) => r.data),
};

export const api = USE_MOCK ? mockApi : realApi;
