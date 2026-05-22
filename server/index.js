import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

import {
  createSession,
  joinSession,
  rejoinSession,
  leaveSession,
  markSocketDisconnected,
  registerSocket,
  getSession,
  getSessionPublic,
  getUserBySocket,
  isHost,
  getCleanupCandidates,
  destroySession,
  setNowPlaying,
  setCurrentPosition,
} from './managers/session-manager.js';
import {
  addSong,
  getPublicQueue,
  getPublicSortedQueue,
  nextSong,
  markPlayed,
  clearQueue,
  moveSong,
} from './managers/queue-manager.js';
import { vote } from './managers/vote-manager.js';
import { generateStats } from './managers/stats-manager.js';
import {
  initGame as ludoInitGame,
  joinGame as ludoJoinGame,
  leaveGame as ludoLeaveGame,
  rollDice as ludoRollDice,
  movePawn as ludoMovePawn,
  getPublicState as ludoGetPublicState,
  startGame as ludoStartGame,
} from './managers/ludo-manager.js';

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // ─── Create Session ────────────────────────────────────────────
  socket.on('create_session', ({ userName, partyType }, callback) => {
    try {
      const { code, hostId, session } = createSession(userName || 'Host', partyType);
      registerSocket(socket.id, code, hostId);
      socket.join(code);

      const publicSession = getSessionPublic(code);
      socket.emit('session_created', {
        code,
        hostId,
        ...publicSession,
      });
      console.log(`Session created: ${code} by ${userName || 'Host'}`);
      callback?.({
        success: true,
        code,
        hostId,
        isHost: true,
        partyType: publicSession.partyType,
        users: publicSession.users || [],
        nowPlaying: publicSession.nowPlaying || null,
        playStartedAt: publicSession.playStartedAt || null,
        currentPosition: publicSession.currentPosition || null,
      });
    } catch (err) {
      console.error('Create session error:', err);
      socket.emit('error', { message: 'Failed to create session' });
      callback?.({ success: false, error: 'Failed to create session' });
    }
  });

  // ─── Join Session ──────────────────────────────────────────────
  socket.on('join_session', ({ code, userName }, callback) => {
    try {
      const normalizedCode = code.toUpperCase();
      const result = joinSession(normalizedCode, userName || 'Guest');
      if (result.error) {
        socket.emit('error', { message: result.error });
        callback?.({ success: false, error: result.error });
        return;
      }
      const { userId, session } = result;
      registerSocket(socket.id, normalizedCode, userId);
      socket.join(normalizedCode);

      const publicSession = getSessionPublic(normalizedCode);
      const queue = getPublicQueue(normalizedCode);
      
      // Notify others
      io.to(normalizedCode).emit('user_joined', {
        userId,
        userName,
        users: publicSession.users,
      });

      // Send full state to joining user
      socket.emit('session_joined', {
        code: normalizedCode,
        userId,
        ...publicSession,
        queue,
      });
      callback?.({
        success: true,
        userId,
        code: normalizedCode,
        hostId: publicSession.hostId,
        isHost: false,
        partyType: publicSession.partyType,
        users: publicSession.users || [],
        nowPlaying: publicSession.nowPlaying || null,
        playStartedAt: publicSession.playStartedAt || null,
        currentPosition: publicSession.currentPosition || null,
        queue: queue || [],
      });

      console.log(`${userName || 'Guest'} joined session ${normalizedCode}`);
    } catch (err) {
      console.error('Join session error:', err);
      socket.emit('error', { message: 'Failed to join session' });
      callback?.({ success: false, error: 'Failed to join session' });
    }
  });

  // ─── Rejoin Session (after reconnect / tab refresh) ────────────
  socket.on('rejoin_session', ({ code, userId }, callback) => {
    try {
      const normalizedCode = (code || '').toUpperCase();
      const result = rejoinSession(normalizedCode, userId);
      if (result.error) {
        callback?.({ success: false, error: result.error });
        return;
      }

      registerSocket(socket.id, normalizedCode, userId);
      socket.join(normalizedCode);

      const publicSession = getSessionPublic(normalizedCode);
      const queue = getPublicSortedQueue(normalizedCode);
      const ludoState = ludoGetPublicState(normalizedCode);

      io.to(normalizedCode).emit('user_reconnected', {
        userId,
        users: publicSession?.users || [],
      });

      callback?.({
        success: true,
        userId,
        code: normalizedCode,
        hostId: publicSession.hostId,
        isHost: publicSession.hostId === userId,
        partyType: publicSession.partyType,
        users: publicSession.users || [],
        nowPlaying: publicSession.nowPlaying || null,
        playStartedAt: publicSession.playStartedAt || null,
        currentPosition: publicSession.currentPosition || null,
        queue: queue || [],
        ludoState: ludoState || null,
      });

      console.log(`User ${userId} rejoined session ${normalizedCode}`);
    } catch (err) {
      console.error('Rejoin session error:', err);
      callback?.({ success: false, error: 'Failed to rejoin session' });
    }
  });

  // ─── Explicit Leave (clicks Leave button) ──────────────────────
  socket.on('leave_session', (_payload, callback) => {
    try {
      const mapping = getUserBySocket(socket.id);
      if (mapping) {
        ludoLeaveGame(mapping.code, mapping.user.id);
      }
      const result = leaveSession(socket.id);
      if (result) {
        const { code, session, user, ended, newHostId } = result;
        if (ended) {
          const stats = generateStats(session, null, session.createdAt, Date.now());
          clearQueue(code);
          destroySession(code);
          io.to(code).emit('session_ended', { stats, reason: 'host_left' });
          console.log(`Session ${code} ended (host left)`);
        } else {
          socket.leave(code);
          const publicSession = getSessionPublic(code);
          io.to(code).emit('user_left', {
            userId: user?.id,
            users: publicSession?.users || [],
            newHostId,
          });
          if (session.users.size === 0) {
            clearQueue(code);
            destroySession(code);
            console.log(`Session ${code} destroyed (empty)`);
          }
        }
      }
      callback?.({ success: true });
    } catch (err) {
      console.error('Leave session error:', err);
      callback?.({ success: false, error: 'Failed to leave session' });
    }
  });

  // ─── Get Full Session State (for re-sync) ──────────────────────
  socket.on('get_session_state', ({ code }, callback) => {
    try {
      const mapping = getUserBySocket(socket.id);
      if (!mapping || mapping.code !== code) {
        callback?.({ success: false, error: 'Not in this session' });
        return;
      }

      const publicSession = getSessionPublic(code);
      const queue = getPublicQueue(code);
      
      callback?.({
        success: true,
        ...publicSession,
        queue,
      });
    } catch (err) {
      console.error('Get session state error:', err);
      callback?.({ success: false, error: 'Failed to get session state' });
    }
  });

  // ─── Disconnect ────────────────────────────────────────────────
  socket.on('move_song', ({ code, songId, direction }, callback) => {
    try {
      const mapping = getUserBySocket(socket.id);
      if (!mapping || mapping.code !== code) return;
      
      const session = getSession(code);
      if (session && session.hostId === mapping.user.id) {
        const result = moveSong(code, songId, direction);
        if (result && result.queue) {
          io.to(code).emit('queue_updated', { queue: result.queue });
        }
      }
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('disconnect', () => {
    try {
      const mapping = getUserBySocket(socket.id);
      const pendingCode = mapping?.code;
      const pendingUserId = mapping?.user?.id;

      const pending = markSocketDisconnected(socket.id, (result) => {
        // Grace period expired without a rejoin — fully remove the user
        const { code, session, user, ended, newHostId } = result;
        if (pendingUserId) {
          try { ludoLeaveGame(code, pendingUserId); } catch {}
        }

        if (ended) {
          const stats = generateStats(session, null, session.createdAt, Date.now());
          clearQueue(code);
          destroySession(code);
          io.to(code).emit('session_ended', { stats, reason: 'host_left' });
          console.log(`Session ${code} ended (host disconnect past grace)`);
        } else {
          const publicSession = getSessionPublic(code);
          io.to(code).emit('user_left', {
            userId: user?.id,
            users: publicSession?.users || [],
            newHostId,
          });
          if (session.users.size === 0) {
            clearQueue(code);
            destroySession(code);
            console.log(`Session ${code} destroyed (empty)`);
          }
        }
      });

      if (pending && pendingCode) {
        const publicSession = getSessionPublic(pendingCode);
        io.to(pendingCode).emit('user_disconnected', {
          userId: pending.userId,
          users: publicSession?.users || [],
          gracePeriodMs: pending.gracePeriodMs,
        });
        console.log(`User ${pending.userId} disconnected (grace ${pending.gracePeriodMs}ms)`);
      }
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  });

  // ─── Add Song ──────────────────────────────────────────────────
  socket.on('add_song', ({ code, song }, callback) => {
    try {
      const mapping = getUserBySocket(socket.id);
      if (!mapping || mapping.code !== code) {
        socket.emit('error', { message: 'Not in this session' });
        callback?.({ success: false, error: 'Not in session' });
        return;
      }
      
      const result = addSong(code, song, mapping.user.id);
      if (result.error) {
        socket.emit('error', { message: result.error });
        callback?.({ success: false, error: result.error });
        return;
      }
      
      io.to(code).emit('queue_updated', { queue: result.queue });
      callback?.({ success: true, queue: result.queue });
      console.log(`Song added to ${code}: ${song.title}`);

      // Auto-play: if nothing is currently playing, start the next song
      const session = getSession(code);
      if (session && !session.nowPlaying) {
        const next = nextSong(code);
        if (next) {
          setNowPlaying(code, next);
          io.to(code).emit('now_playing', {
            song: { ...next, votes: undefined },
          });
          io.to(code).emit('queue_updated', { queue: getPublicSortedQueue(code) });
          console.log(`Auto-playing: ${next.title}`);
        }
      }
    } catch (err) {
      console.error('Add song error:', err);
      socket.emit('error', { message: 'Failed to add song' });
      callback?.({ success: false, error: 'Failed to add song' });
    }
  });

  // ─── Vote ──────────────────────────────────────────────────────
  socket.on('vote_song', ({ code, songId, direction }, callback) => {
    try {
      const mapping = getUserBySocket(socket.id);
      if (!mapping || mapping.code !== code) {
        socket.emit('error', { message: 'Not in this session' });
        callback?.({ success: false, error: 'Not in session' });
        return;
      }
      
      const result = vote(code, songId, mapping.user.id, direction);
      if (result.error) {
        socket.emit('error', { message: result.error });
        callback?.({ success: false, error: result.error });
        return;
      }

      // Broadcast vote result
      io.to(code).emit('vote_confirmed', {
        songId: result.songId,
        score: result.score,
        userId: mapping.user.id,
        queue: result.queue,
      });

      if (result.shouldSkip) {
        io.to(code).emit('song_skipped', {
          songId: result.songId,
          reason: 'Auto-skip threshold reached',
          queue: result.queue,
        });
      }
      
      callback?.({ success: true, score: result.score, shouldSkip: result.shouldSkip });
    } catch (err) {
      console.error('Vote error:', err);
      socket.emit('error', { message: 'Failed to vote' });
      callback?.({ success: false, error: 'Failed to vote' });
    }
  });

  // ─── Skip Current (Host Only) ──────────────────────────────────
  socket.on('skip_current', ({ code }, callback) => {
    try {
      const mapping = getUserBySocket(socket.id);
      if (!mapping || !isHost(code, mapping.user.id)) {
        socket.emit('error', { message: 'Only the host can skip' });
        callback?.({ success: false, error: 'Host only' });
        return;
      }

      const session = getSession(code);
      if (session && session.nowPlaying) {
        markPlayed(code, session.nowPlaying.id);
      }

      const next = nextSong(code);
      if (next) {
        setNowPlaying(code, next);
        io.to(code).emit('now_playing', {
          song: { ...next, votes: undefined },
        });
        io.to(code).emit('queue_updated', { queue: getPublicSortedQueue(code) });
      } else {
        setNowPlaying(code, null);
        io.to(code).emit('queue_empty');
      }

      io.to(code).emit('host_skip');
      callback?.({ success: true });
    } catch (err) {
      console.error('Skip error:', err);
      socket.emit('error', { message: 'Failed to skip' });
      callback?.({ success: false, error: 'Failed to skip' });
    }
  });

  // ─── Song Ended ────────────────────────────────────────────────
  socket.on('song_ended', ({ code, songId }, callback) => {
    try {
      const mapping = getUserBySocket(socket.id);
      if (!mapping || mapping.code !== code) {
        callback?.({ success: false, error: 'Not in session' });
        return;
      }

      markPlayed(code, songId);
      const next = nextSong(code);
      
      if (next) {
        setNowPlaying(code, next);
        io.to(code).emit('now_playing', {
          song: { ...next, votes: undefined },
        });
      } else {
        setNowPlaying(code, null);
        io.to(code).emit('queue_empty');
      }
      
      callback?.({ success: true, next });
    } catch (err) {
      console.error('Song ended error:', err);
      socket.emit('error', { message: 'Failed to advance song' });
      callback?.({ success: false, error: 'Failed to advance song' });
    }
  });

  // ─── Chat Message ────────────────────────────────────────────────
  socket.on('send_chat_message', ({ code, text }, callback) => {
    try {
      const mapping = getUserBySocket(socket.id);
      if (!mapping || mapping.code !== code) {
        callback?.({ success: false, error: 'Not in session' });
        return;
      }
      
      const message = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
        userId: mapping.user.id,
        userName: mapping.user.name,
        text: text,
        timestamp: Date.now(),
      };
      
      io.to(code).emit('chat_message', message);
      callback?.({ success: true });
    } catch (err) {
      console.error('Chat error:', err);
      callback?.({ success: false, error: 'Failed to send message' });
    }
  });

  // ─── Get Queue ──────────────────────────────────────────────────
  socket.on('get_queue', ({ code }, callback) => {
    try {
      const mapping = getUserBySocket(socket.id);
      if (!mapping || mapping.code !== code) {
        callback?.({ success: false, error: 'Not in session' });
        return;
      }

      const queue = getPublicSortedQueue(code);
      io.to(code).emit('queue_updated', { queue });
      callback?.({ success: true, queue });
    } catch (err) {
      console.error('Get queue error:', err);
      socket.emit('error', { message: 'Failed to get queue' });
      callback?.({ success: false, error: 'Failed to get queue' });
    }
  });

  // ─── Host playback position broadcast ─────────────────────────
  socket.on('host_position_tick', ({ code, videoId, position }) => {
    try {
      const mapping = getUserBySocket(socket.id);
      if (!mapping || mapping.code !== code) return;
      if (!isHost(code, mapping.user.id)) return;

      const session = getSession(code);
      if (!session?.nowPlaying || session.nowPlaying.videoId !== videoId) return;

      setCurrentPosition(code, videoId, position);
      socket.to(code).emit('position_sync', {
        videoId,
        position: Number(position) || 0,
        serverTime: Date.now(),
      });
    } catch (err) {
      console.error('host_position_tick error:', err);
    }
  });

  // ─── Ludo ──────────────────────────────────────────────────────
  socket.on('ludo_join', ({ code }, callback) => {
    try {
      const mapping = getUserBySocket(socket.id);
      if (!mapping || mapping.code !== code) {
        callback?.({ success: false, error: 'Not in this session' });
        return;
      }

      ludoInitGame(code);
      const result = ludoJoinGame(code, mapping.user.id, mapping.user.name);
      if (result.error) {
        callback?.({ success: false, error: result.error });
        return;
      }

      io.to(code).emit('ludo_state_update', {
        ...ludoGetPublicState(code),
        joinedColor: result.color,
      });
      callback?.({ success: true, color: result.color });
      console.log(`${mapping.user.name} joined Ludo in ${code}`);
    } catch (err) {
      console.error('Ludo join error:', err);
      callback?.({ success: false, error: 'Failed to join Ludo' });
    }
  });

  socket.on('ludo_start', ({ code }, callback) => {
    try {
      const mapping = getUserBySocket(socket.id);
      if (!mapping || mapping.code !== code) {
        callback?.({ success: false, error: 'Not in this session' });
        return;
      }
      if (!isHost(code, mapping.user.id)) {
        callback?.({ success: false, error: 'Only the host can start the game' });
        return;
      }

      const result = ludoStartGame(code, mapping.user.id);
      if (result.error) {
        callback?.({ success: false, error: result.error });
        return;
      }

      io.to(code).emit('ludo_state_update', ludoGetPublicState(code));
      callback?.({ success: true });
    } catch (err) {
      console.error('Ludo start error:', err);
      callback?.({ success: false, error: 'Failed to start game' });
    }
  });

  socket.on('ludo_roll', ({ code }, callback) => {
    try {
      const mapping = getUserBySocket(socket.id);
      if (!mapping || mapping.code !== code) {
        callback?.({ success: false, error: 'Not in this session' });
        return;
      }

      const result = ludoRollDice(code, mapping.user.id);
      if (result.error) {
        callback?.({ success: false, error: result.error });
        return;
      }

      io.to(code).emit('ludo_state_update', {
        ...ludoGetPublicState(code),
        lastRollResult: result,
      });
      callback?.({ success: true, ...result });
    } catch (err) {
      console.error('Ludo roll error:', err);
      callback?.({ success: false, error: 'Failed to roll dice' });
    }
  });

  socket.on('ludo_move', ({ code, pawnIndex }, callback) => {
    try {
      const mapping = getUserBySocket(socket.id);
      if (!mapping || mapping.code !== code) {
        callback?.({ success: false, error: 'Not in this session' });
        return;
      }

      const result = ludoMovePawn(code, mapping.user.id, pawnIndex);
      if (result.error) {
        callback?.({ success: false, error: result.error });
        return;
      }

      io.to(code).emit('ludo_state_update', {
        ...ludoGetPublicState(code),
        lastMoveResult: result,
      });
      callback?.({ success: true, ...result });
    } catch (err) {
      console.error('Ludo move error:', err);
      callback?.({ success: false, error: 'Failed to move pawn' });
    }
  });

  socket.on('ludo_leave', ({ code }, callback) => {
    try {
      const mapping = getUserBySocket(socket.id);
      if (!mapping || mapping.code !== code) return;

      ludoLeaveGame(code, mapping.user.id);
      io.to(code).emit('ludo_state_update', ludoGetPublicState(code));
      callback?.({ success: true });
    } catch (err) {
      console.error('Ludo leave error:', err);
      callback?.({ success: false, error: 'Failed to leave Ludo' });
    }
  });
});

// Cleanup stale sessions every 30 minutes
setInterval(() => {
  const candidates = getCleanupCandidates();
  for (const code of candidates) {
    clearQueue(code);
    destroySession(code);
    console.log(`Cleaned up stale session: ${code}`);
  }
}, 30 * 60 * 1000);

httpServer.listen(PORT, () => {
  console.log(`AuxDrop server running on port ${PORT}`);
  console.log(`Client origin: ${CLIENT_ORIGIN}`);
  console.log(`Accepting connections from: ${CLIENT_ORIGIN}`);
});
