import { nanoid } from 'nanoid';

const sessions = new Map();
const userSockets = new Map();
// userId -> { timer, code } — pending grace-period removals keyed by userId
const pendingDisconnects = new Map();

const DISCONNECT_GRACE_MS = 30 * 1000;

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function formatUserList(userMap) {
  return Array.from(userMap.values()).map(u => ({
    id: u.id,
    name: u.name,
    isHost: u.isHost,
    joinedAt: u.joinedAt,
    connected: u.connected !== false,
  }));
}

export function createSession(hostName = 'Host', partyType = 'music') {
  let code;
  do {
    code = generateCode();
  } while (sessions.has(code));

  const hostId = nanoid(8);
  const session = {
    code,
    hostId,
    users: new Map([[hostId, { id: hostId, name: hostName, isHost: true, joinedAt: Date.now(), connected: true }]]),
    partyType,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    nowPlaying: null,
    playStartedAt: null,
    currentPosition: null, // { videoId, position, updatedAt }
    endedAt: null,
  };

  sessions.set(code, session);
  return { code, hostId, session };
}

export function joinSession(code, userName) {
  const session = sessions.get(code);
  if (!session) return { error: 'Session not found' };
  if (session.endedAt) return { error: 'Session has ended' };
  if (session.users.size >= 20) return { error: 'Session is full (max 20 users)' };

  const userId = nanoid(8);
  session.users.set(userId, {
    id: userId,
    name: userName,
    isHost: false,
    joinedAt: Date.now(),
    connected: true,
  });
  session.lastActivity = Date.now();

  return { userId, session };
}

// Attempt to rebind an existing user record to a new socket id.
// Used when a client reconnects after a transient disconnect.
export function rejoinSession(code, userId) {
  const session = sessions.get(code);
  if (!session) return { error: 'Session not found' };
  if (session.endedAt) return { error: 'Session has ended' };

  const user = session.users.get(userId);
  if (!user) return { error: 'User no longer in session' };

  // Cancel any pending grace-period removal
  const pending = pendingDisconnects.get(userId);
  if (pending) {
    clearTimeout(pending.timer);
    pendingDisconnects.delete(userId);
  }

  user.connected = true;
  session.lastActivity = Date.now();

  return { userId, session, user };
}

// Immediately remove a user from a session (legacy behavior — used for explicit leave).
export function leaveSession(socketId) {
  const mapping = userSockets.get(socketId);
  if (!mapping) return null;

  const { code, userId } = mapping;
  userSockets.delete(socketId);

  // Clear any pending grace timer for this user
  const pending = pendingDisconnects.get(userId);
  if (pending) {
    clearTimeout(pending.timer);
    pendingDisconnects.delete(userId);
  }

  return removeUserFromSession(code, userId);
}

// Mark the user as disconnected and start a grace timer. If the user reconnects
// within the grace window, the timer is canceled and they keep their slot/host status.
// onExpire is called with { code, session, user, ended, newHostId } when removal happens.
export function markSocketDisconnected(socketId, onExpire) {
  const mapping = userSockets.get(socketId);
  if (!mapping) return null;

  const { code, userId } = mapping;
  userSockets.delete(socketId);

  const session = sessions.get(code);
  if (!session) return null;
  const user = session.users.get(userId);
  if (!user) return null;

  user.connected = false;
  session.lastActivity = Date.now();

  // Clear any prior pending timer for this user (defensive)
  const prior = pendingDisconnects.get(userId);
  if (prior) clearTimeout(prior.timer);

  const timer = setTimeout(() => {
    pendingDisconnects.delete(userId);
    // Only remove if user is still marked disconnected (no rejoin happened)
    const stillThere = session.users.get(userId);
    if (!stillThere || stillThere.connected) return;
    const result = removeUserFromSession(code, userId);
    if (result && onExpire) onExpire(result);
  }, DISCONNECT_GRACE_MS);

  pendingDisconnects.set(userId, { timer, code });

  return { code, userId, user, gracePeriodMs: DISCONNECT_GRACE_MS };
}

function removeUserFromSession(code, userId) {
  const session = sessions.get(code);
  if (!session) return null;

  const user = session.users.get(userId);
  if (!user) return null;

  session.users.delete(userId);
  session.lastActivity = Date.now();

  if (user.isHost) {
    // Find another *connected* user to promote; fall back to any user
    const connected = Array.from(session.users.values()).find(u => u.connected);
    const next = connected || session.users.values().next().value;
    if (next) {
      next.isHost = true;
      session.hostId = next.id;
      return { code, session, newHostId: next.id, user };
    }
    session.endedAt = Date.now();
    return { code, session, ended: true, user };
  }

  return { code, session, user };
}

export function registerSocket(socketId, code, userId) {
  // If this socket id was previously mapped, clear the mapping first
  if (userSockets.has(socketId)) userSockets.delete(socketId);
  userSockets.set(socketId, { code, userId });

  // Remove any prior socket mappings for this same userId (transparent rebind on reconnect)
  for (const [sid, mapping] of userSockets) {
    if (sid !== socketId && mapping.userId === userId && mapping.code === code) {
      userSockets.delete(sid);
    }
  }
}

export function getSession(code) {
  return sessions.get(code) || null;
}

export function getSessionPublic(code) {
  const session = sessions.get(code);
  if (!session) return null;
  return {
    code: session.code,
    hostId: session.hostId,
    partyType: session.partyType,
    users: formatUserList(session.users),
    createdAt: session.createdAt,
    nowPlaying: session.nowPlaying,
    playStartedAt: session.playStartedAt,
    currentPosition: session.currentPosition,
  };
}

export function getSessions() {
  return sessions;
}

export function getUserBySocket(socketId) {
  const mapping = userSockets.get(socketId);
  if (!mapping) return null;
  const session = sessions.get(mapping.code);
  if (!session) return null;
  return {
    code: mapping.code,
    user: session.users.get(mapping.userId),
    session,
  };
}

export function getCleanupCandidates(maxAge = 4 * 60 * 60 * 1000) {
  const now = Date.now();
  const candidates = [];
  for (const [code, session] of sessions) {
    if (now - session.lastActivity > maxAge) {
      candidates.push(code);
    }
  }
  return candidates;
}

export function destroySession(code) {
  sessions.delete(code);
}

export function isHost(code, userId) {
  const session = sessions.get(code);
  return session?.hostId === userId;
}

export function setNowPlaying(code, song) {
  const session = sessions.get(code);
  if (session) {
    session.nowPlaying = song || null;
    session.playStartedAt = song ? Date.now() : null;
    session.currentPosition = null;
    session.lastActivity = Date.now();
  }
}

export function setCurrentPosition(code, videoId, position) {
  const session = sessions.get(code);
  if (!session) return;
  // Ignore stale ticks for a song that's no longer playing
  if (!session.nowPlaying || session.nowPlaying.videoId !== videoId) return;
  session.currentPosition = {
    videoId,
    position: Number(position) || 0,
    updatedAt: Date.now(),
  };
}

export function getCurrentPosition(code) {
  const session = sessions.get(code);
  return session?.currentPosition || null;
}
