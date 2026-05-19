import { io } from 'socket.io-client';

let socket = null;

export function connect() {
  if (socket?.connected) return socket;

  const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
  socket = io(backendUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    updateConnectionStatus('connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    updateConnectionStatus('disconnected');
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
    updateConnectionStatus('connecting');
  });

  socket.on('reconnect_attempt', () => {
    updateConnectionStatus('connecting');
  });

  socket.on('reconnect', () => {
    updateConnectionStatus('connected');
  });

  return socket;
}

function updateConnectionStatus(status) {
  const el = document.getElementById('connection-status');
  if (el) {
    el.className = `connection-status ${status}`;
    el.textContent = status.charAt(0).toUpperCase() + status.slice(1);
  }
}

export function getSocket() {
  return socket;
}

export function createSession(userName) {
  if (!socket) connect();
  return new Promise((resolve) => {
    socket.emit('create_session', { userName }, (response) => {
      if (response?.success) {
        resolve(response);
      } else {
        resolve({ error: response?.error || 'Failed to create session' });
      }
    });
    setTimeout(() => resolve({ error: 'Request timeout' }), 15000);
  });
}

export function joinSession(code, userName) {
  if (!socket) connect();
  return new Promise((resolve) => {
    socket.emit('join_session', { code, userName }, (response) => {
      if (response?.success) {
        resolve(response);
      } else {
        resolve({ error: response?.error || 'Failed to join session' });
      }
    });
    setTimeout(() => resolve({ error: 'Request timeout' }), 15000);
  });
}

export function getSessionState(code) {
  if (!socket) connect();
  return new Promise((resolve) => {
    socket.emit('get_session_state', { code }, (response) => {
      resolve(response || { error: 'Failed to get session state' });
    });
    setTimeout(() => resolve({ error: 'Request timeout' }), 15000);
  });
}

export function addSong(code, song) {
  if (!socket) return Promise.reject('Not connected');
  return new Promise((resolve) => {
    socket.emit('add_song', { code, song }, (response) => {
      resolve(response || { error: 'Failed to add song' });
    });
    setTimeout(() => resolve({ error: 'Request timeout' }), 15000);
  });
}

export function voteSong(code, songId, direction) {
  if (!socket) return Promise.reject('Not connected');
  return new Promise((resolve) => {
    socket.emit('vote_song', { code, songId, direction }, (response) => {
      resolve(response || { error: 'Failed to vote' });
    });
    setTimeout(() => resolve({ error: 'Request timeout' }), 15000);
  });
}

export function skipCurrent(code) {
  if (!socket) return Promise.reject('Not connected');
  return new Promise((resolve) => {
    socket.emit('skip_current', { code }, (response) => {
      resolve(response || { error: 'Failed to skip' });
    });
    setTimeout(() => resolve({ error: 'Request timeout' }), 15000);
  });
}

export function songEnded(code, songId) {
  if (!socket) return Promise.reject('Not connected');
  return new Promise((resolve) => {
    socket.emit('song_ended', { code, songId }, (response) => {
      resolve(response || { error: 'Failed to update song status' });
    });
    setTimeout(() => resolve({ error: 'Request timeout' }), 15000);
  });
}

export function sendChatMessage(code, text) {
  if (!socket) return Promise.reject('Not connected');
  return new Promise((resolve) => {
    socket.emit('send_chat_message', { code, text }, (response) => {
      resolve(response || { error: 'Failed to send message' });
    });
    setTimeout(() => resolve({ error: 'Request timeout' }), 15000);
  });
}

export function getQueue(code) {
  if (!socket) return Promise.reject('Not connected');
  return new Promise((resolve) => {
    socket.emit('get_queue', { code }, (response) => {
      resolve(response || { error: 'Failed to get queue' });
    });
    setTimeout(() => resolve({ error: 'Request timeout' }), 15000);
  });
}

export function moveSong(code, songId, direction) {
  if (!socket) return Promise.reject('Not connected');
  return new Promise((resolve) => {
    socket.emit('move_song', { code, songId, direction }, (response) => {
      resolve(response || { error: 'Failed to move song' });
    });
    setTimeout(() => resolve({ error: 'Request timeout' }), 15000);
  });
}

export function ludoJoin(code) {
  if (!socket) return Promise.reject('Not connected');
  return new Promise((resolve) => {
    socket.emit('ludo_join', { code }, (response) => {
      resolve(response || { error: 'Failed to join Ludo' });
    });
    setTimeout(() => resolve({ error: 'Request timeout' }), 15000);
  });
}

export function ludoRoll(code) {
  if (!socket) return Promise.reject('Not connected');
  return new Promise((resolve) => {
    socket.emit('ludo_roll', { code }, (response) => {
      resolve(response || { error: 'Failed to roll' });
    });
    setTimeout(() => resolve({ error: 'Request timeout' }), 15000);
  });
}

export function ludoMove(code, pawnIndex) {
  if (!socket) return Promise.reject('Not connected');
  return new Promise((resolve) => {
    socket.emit('ludo_move', { code, pawnIndex }, (response) => {
      resolve(response || { error: 'Failed to move' });
    });
    setTimeout(() => resolve({ error: 'Request timeout' }), 15000);
  });
}

export function ludoLeave(code) {
  if (!socket) return Promise.reject('Not connected');
  return new Promise((resolve) => {
    socket.emit('ludo_leave', { code }, (response) => {
      resolve(response || { error: 'Failed to leave Ludo' });
    });
    setTimeout(() => resolve({ error: 'Request timeout' }), 15000);
  });
}

export function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
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
  if (socket) {
    socket.off(event, callback);
  }
}
