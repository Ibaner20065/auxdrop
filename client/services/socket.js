import { io } from 'socket.io-client';

// ─── Connection state machine ──────────────────────────────────
// idle | connecting | connected | reconnecting | disconnected
let socket = null;
let connectionState = 'idle';
const connectionListeners = new Set();
let rejoinHandler = null;
let autoRejoinAttempted = false;

const STORAGE_KEY = 'auxdrop:session';
const AUTO_REJOIN_TTL_MS = 60 * 60 * 1000; // 1 hour

function ts() {
  return new Date().toISOString().slice(11, 23);
}

function log(...args) {
  console.log(`[socket ${ts()}]`, ...args);
}

function setConnectionState(state) {
  if (connectionState === state) return;
  connectionState = state;
  updateConnectionPills(state);
  for (const fn of connectionListeners) {
    try { fn(state); } catch (err) { console.error(err); }
  }
}

function updateConnectionPills(state) {
  const label = state.charAt(0).toUpperCase() + state.slice(1);
  document.querySelectorAll('.connection-status').forEach(el => {
    el.className = `connection-status ${state}`;
    el.textContent = label;
  });
}

export function onConnectionState(fn) {
  connectionListeners.add(fn);
  try { fn(connectionState); } catch {}
  return () => connectionListeners.delete(fn);
}

export function getConnectionState() {
  return connectionState;
}

// ─── Session storage for tab-refresh rejoin ────────────────────
export function storeSession(code, userId) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ code, userId, savedAt: Date.now() }));
  } catch {}
}

export function clearStoredSession() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
  autoRejoinAttempted = false;
}

function getStoredSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.code || !data?.userId) return null;
    if (Date.now() - (data.savedAt || 0) > AUTO_REJOIN_TTL_MS) {
      clearStoredSession();
      return null;
    }
    return data;
  } catch { return null; }
}

export function setRejoinHandler(fn) {
  rejoinHandler = fn;
}

// ─── Connect ───────────────────────────────────────────────────
export function connect() {
  if (socket && (socket.connected || socket.active)) return socket;

  const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
  log(`Connecting to ${backendUrl}`);
  setConnectionState('connecting');

  socket = io(backendUrl, {
    // Default transport order — polling completes the handshake immediately,
    // then auto-upgrades to websocket. Forcing websocket-first caused first-attempt
    // failures when the upgrade raced against the initial emit.
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 20,
    timeout: 10000,
  });

  socket.on('connect', () => {
    const transport = socket.io?.engine?.transport?.name || 'unknown';
    log(`Connected id=${socket.id} transport=${transport}`);
    setConnectionState('connected');
    tryAutoRejoin();
  });

  socket.on('disconnect', (reason) => {
    log(`Disconnected: ${reason}`);
    setConnectionState(reason === 'io client disconnect' ? 'disconnected' : 'reconnecting');
  });

  socket.on('connect_error', (err) => {
    console.warn(`[socket ${ts()}] connect_error: ${err.message}`);
    setConnectionState('reconnecting');
  });

  socket.on('reconnect_attempt', (n) => {
    log(`reconnect_attempt #${n}`);
    setConnectionState('reconnecting');
  });

  socket.on('reconnect', () => {
    log(`Reconnected`);
    setConnectionState('connected');
    autoRejoinAttempted = false; // allow re-rejoin on next connect
  });

  if (socket.io?.engine) {
    socket.io.engine.on('upgrade', (transport) => {
      log(`Transport upgraded to ${transport.name}`);
    });
  }

  return socket;
}

// Resolves only after a real `connect` event fires.
export function ensureConnected(timeoutMs = 10000) {
  if (!socket) connect();
  if (socket.connected) return Promise.resolve(socket);

  return new Promise((resolve, reject) => {
    let settled = false;
    const onConnect = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(socket);
    };
    const cleanup = () => {
      socket.off('connect', onConnect);
      clearTimeout(timer);
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Connection timeout — please refresh and try again'));
    }, timeoutMs);
    socket.on('connect', onConnect);
  });
}

// ─── Emit with ack + retry ─────────────────────────────────────
async function emitWithAck(event, payload, { timeout = 8000, retries = 2 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await ensureConnected();
      const response = await new Promise((resolve, reject) => {
        let resolved = false;
        const timer = setTimeout(() => {
          if (resolved) return;
          resolved = true;
          reject(new Error(`Ack timeout (event=${event} attempt=${attempt + 1})`));
        }, timeout);
        socket.emit(event, payload, (resp) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timer);
          resolve(resp);
        });
      });
      return response || { success: false, error: 'No response from server' };
    } catch (err) {
      lastErr = err;
      console.warn(`[socket ${ts()}] ${event} attempt ${attempt + 1} failed: ${err.message}`);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
      }
    }
  }
  return { success: false, error: lastErr?.message || 'Request failed' };
}

// ─── Auto-rejoin on (re)connect ────────────────────────────────
async function tryAutoRejoin() {
  if (autoRejoinAttempted) return;
  const stored = getStoredSession();
  if (!stored || !rejoinHandler) return;
  autoRejoinAttempted = true;
  log(`Auto-rejoin: ${stored.code} / ${stored.userId}`);
  try {
    const response = await emitWithAck('rejoin_session', stored, { retries: 0, timeout: 5000 });
    if (response?.success) {
      log(`Auto-rejoin OK`);
      rejoinHandler(response);
    } else {
      log(`Auto-rejoin rejected: ${response?.error || 'unknown'}`);
      clearStoredSession();
    }
  } catch (err) {
    console.warn(`[socket ${ts()}] Auto-rejoin error: ${err.message}`);
  }
}

// ─── Wrapper helpers ───────────────────────────────────────────
export function getSocket() { return socket; }

export function createSession(userName, partyType = 'music') {
  return emitWithAck('create_session', { userName, partyType });
}

export function joinSession(code, userName) {
  return emitWithAck('join_session', { code, userName });
}

export function rejoinSession(code, userId) {
  return emitWithAck('rejoin_session', { code, userId }, { retries: 0 });
}

export function getSessionState(code) {
  return emitWithAck('get_session_state', { code });
}

export function addSong(code, song) {
  return emitWithAck('add_song', { code, song });
}

export function voteSong(code, songId, direction) {
  return emitWithAck('vote_song', { code, songId, direction });
}

export function skipCurrent(code) {
  return emitWithAck('skip_current', { code });
}

export function songEnded(code, songId) {
  return emitWithAck('song_ended', { code, songId });
}

export function sendChatMessage(code, text) {
  return emitWithAck('send_chat_message', { code, text }, { retries: 0, timeout: 4000 });
}

export function getQueue(code) {
  return emitWithAck('get_queue', { code });
}

export function moveSong(code, songId, direction) {
  return emitWithAck('move_song', { code, songId, direction });
}

export function hostPositionTick(code, videoId, position) {
  if (!socket?.connected) return;
  socket.emit('host_position_tick', { code, videoId, position });
}

export function ludoJoin(code) {
  return emitWithAck('ludo_join', { code });
}

export function ludoStart(code) {
  return emitWithAck('ludo_start', { code });
}

export function ludoRoll(code) {
  return emitWithAck('ludo_roll', { code });
}

export function ludoMove(code, pawnIndex) {
  return emitWithAck('ludo_move', { code, pawnIndex });
}

export function ludoLeave(code) {
  return emitWithAck('ludo_leave', { code }, { retries: 0, timeout: 3000 });
}

export function disconnect() {
  clearStoredSession();
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  setConnectionState('idle');
}

export function on(event, callback) {
  if (!socket) connect();
  socket.on(event, callback);
}

export function once(event, callback) {
  if (!socket) connect();
  socket.once(event, callback);
}

export function off(event, callback) {
  if (socket) socket.off(event, callback);
}

// ─── Auto-connect on module load ──────────────────────────────
// Warm the socket before any user click so the first interaction is instant.
if (typeof window !== 'undefined') {
  // Defer one tick so imports settle and DOM has parsed.
  queueMicrotask(() => {
    try { connect(); } catch (err) { console.error('[socket] auto-connect failed', err); }
  });
}
