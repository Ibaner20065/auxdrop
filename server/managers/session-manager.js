import { nanoid } from 'nanoid';

const sessions = new Map();
const userSockets = new Map();

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
  }));
}

export function createSession(hostName = 'Host') {
  let code;
  do {
    code = generateCode();
  } while (sessions.has(code));

  const hostId = nanoid(8);
  const session = {
    code,
    hostId,
    users: new Map([[hostId, { id: hostId, name: hostName, isHost: true, joinedAt: Date.now() }]]),
    createdAt: Date.now(),
    lastActivity: Date.now(),
    nowPlaying: null,
    playStartedAt: null,
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
  });
  session.lastActivity = Date.now();

  return { userId, session };
}

export function leaveSession(socketId) {
  const mapping = userSockets.get(socketId);
  if (!mapping) return null;

  const { code, userId } = mapping;
  const session = sessions.get(code);
  if (!session) return null;

  const user = session.users.get(userId);
  session.users.delete(userId);
  session.lastActivity = Date.now();
  userSockets.delete(socketId);

  if (user?.isHost) {
    session.endedAt = Date.now();
    if (session.users.size > 0) {
      const nextUser = session.users.values().next().value;
      nextUser.isHost = true;
      session.hostId = nextUser.id;
      return { code, session, newHostId: nextUser.id, user };
    }
    return { code, session, ended: true, user };
  }

  return { code, session, user };
}

export function registerSocket(socketId, code, userId) {
  userSockets.set(socketId, { code, userId });
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
    users: formatUserList(session.users),
    createdAt: session.createdAt,
    nowPlaying: session.nowPlaying,
    playStartedAt: session.playStartedAt,
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
    session.lastActivity = Date.now();
  }
}
