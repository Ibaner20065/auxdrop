import App from '../main.js';
import { on, off, addSong, getQueue, disconnect, joinSession, sendChatMessage, ludoJoin, hostPositionTick, skipCurrent, songEnded } from '../services/socket.js';
import { initPlayer, loadSong, getPlayer, getCurrentVideoId } from '../services/player.js';
import { showNotification } from '../components/notifications.js';
import { renderNowPlaying } from '../components/now-playing.js';
import { renderQueueCarousel, updateQueueCarousel } from '../components/queue-carousel.js';
import { renderSessionHeader } from '../components/session-header.js';
import { renderUserBubbles, updateUserBubbles } from '../components/user-bubbles.js';
import { openSearchModal } from '../components/search-modal.js';
import { openYouTubeImportModal } from '../components/youtube-import.js';
import { renderPlayerControls } from '../components/player-controls.js';
import { openStatsModal } from '../components/stats-modal.js';
import { renderLudoBoard, updateLudoBoard } from '../components/ludo-board.js';

const SESSION_SELECTOR = '#view-session';
let eventHandlers = [];
let lastHostTickAt = 0;
let progressHandler = null;
const HOST_TICK_INTERVAL_MS = 5000;
const DRIFT_THRESHOLD_S = 2.0;

function computeElapsedSeconds(startedAt) {
  if (!startedAt) return 0;
  return Math.max(0, (Date.now() - startedAt) / 1000);
}

function loadSongWithSync(song, playStartedAt, currentPosition) {
  if (!song) return;
  let startSeconds = 0;
  if (currentPosition && currentPosition.videoId === song.videoId && currentPosition.updatedAt) {
    const elapsedSincePos = (Date.now() - currentPosition.updatedAt) / 1000;
    startSeconds = Math.max(0, (currentPosition.position || 0) + elapsedSincePos);
  } else if (playStartedAt) {
    startSeconds = computeElapsedSeconds(playStartedAt);
  }
  console.log(`[sync] loading ${song.videoId} at ${startSeconds.toFixed(1)}s`);
  loadSong(song.videoId, startSeconds);
}

export async function render() {
  const container = document.querySelector(SESSION_SELECTOR);
  const state = App.state;

  container.className = 'view active session';
  container.innerHTML = `
    <!-- Ambient Energy Visualizer -->
    <div id="energy-visualizer"></div>
    
    <div id="session-header-container"></div>
    <div id="youtube-player" style="position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;"></div>
    
    <main class="dashboard-grid">
      <!-- LEFT COLUMN: Music Engine -->
      <div class="main-column" style="display:flex; flex-direction:column; gap:24px;">
        <div id="now-playing-container"></div>
        
        <div class="queue-container">
          <div class="queue-header">
            <h2 class="display" style="font-size: 1.5rem; letter-spacing: 2px;">LIVE QUEUE</h2>
            <div style="display:flex; gap:12px;">
              <button class="btn" id="btn-open-search" style="padding: 8px 16px; font-size: 0.9rem;">
                <span style="color:var(--neon-cyan)">+</span> ADD TRACK
              </button>
              <button class="btn" id="btn-open-yt" style="padding: 8px 16px; font-size: 0.9rem; border-color:var(--neon-pink);">
                <span style="color:var(--neon-pink)">▶</span> IMPORT
              </button>
            </div>
          </div>
          <div id="queue-carousel-container"></div>
        </div>
        
        <!-- Game Widgets Container -->
        <div id="game-widget-container" style="display:none; margin-top:24px; border:var(--brutal-border); background:var(--bg-surface); padding:24px;">
           <h2 class="display" style="font-size:1.5rem; margin-bottom:16px;">GAME ARENA</h2>
           <div id="tab-ludo"></div>
           <div id="tab-snakes" style="display:none;"></div>
        </div>
      </div>
      
      <!-- RIGHT COLUMN: Social & Chat -->
      <div class="social-panel">
        <div style="padding: 16px 24px; border-bottom: 1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center;">
          <h2 class="display" style="font-size: 1.2rem;">PARTY CHAT</h2>
          <span class="mono" style="font-size: 0.8rem; color:var(--neon-cyan);">LIVE</span>
        </div>
        
        <div id="chat-messages" class="chat-messages">
          <div class="chat-message system">Welcome to the VIP room. Type a message to start interacting!</div>
        </div>
        
        <div class="chat-input-wrap">
          <input type="text" id="chat-input" class="input" placeholder="Type a message..." maxlength="200" style="padding:12px;">
          <button id="btn-send-chat" class="btn btn-primary" style="padding: 12px 24px;">SEND</button>
        </div>
      </div>
    </main>
    
    <div id="player-controls-container"></div>
  `;

  renderSessionHeader(state);
  renderUserBubbles(state.users || [], state);
  renderNowPlaying(state.nowPlaying, state);
  renderQueueCarousel(state.queue || [], state);
  renderPlayerControls(state);
  
  // Game Widgets setup
  renderLudoBoard(document.getElementById('tab-ludo'));
  if (state.initialTab === 'ludo' || state.initialTab === 'snakes') {
      document.getElementById('game-widget-container').style.display = 'block';
  }

  attachSessionEvents();
  setupSocketListeners();

  if (!state.playerReady) {
    initPlayer(
      'youtube-player',
      () => {
        state.playerReady = true;
        console.log('YouTube player ready');
        if (state.nowPlaying) {
          loadSongWithSync(state.nowPlaying, state.playStartedAt, state.currentPosition);
        }
      },
      state.isHost ? handleSongEnd : null
    );
  } else if (state.nowPlaying) {
    loadSongWithSync(state.nowPlaying, state.playStartedAt, state.currentPosition);
  }

  setupHostPositionTick();
  getQueue(state.code);

  if (state.initialTab === 'ludo') {
    setTimeout(() => {
      ludoJoin(state.code).catch(err => console.error("Auto-join Ludo failed:", err));
    }, 500);
  }
}

function attachSessionEvents() {
  document.getElementById('btn-open-search')?.addEventListener('click', () => {
    openSearchModal(handleAddSong);
  });
  document.getElementById('btn-open-yt')?.addEventListener('click', () => {
    openYouTubeImportModal(handleAddSong);
  });

  const chatInput = document.getElementById('chat-input');
  const btnSendChat = document.getElementById('btn-send-chat');
  
  const handleSendChat = () => {
    const text = chatInput.value.trim();
    if (!text) return;
    sendChatMessage(App.state.code, text);
    chatInput.value = '';
    triggerEnergyBurst();
  };
  
  btnSendChat?.addEventListener('click', handleSendChat);
  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSendChat();
  });
}

function triggerEnergyBurst() {
  // A small visual burst when users interact (chat, vote, etc.)
  const visualizer = document.getElementById('energy-visualizer');
  if (!visualizer) return;
  visualizer.style.boxShadow = 'inset 0 0 150px rgba(0, 209, 255, 0.3)';
  setTimeout(() => {
    visualizer.style.boxShadow = 'none';
  }, 300);
}

function handleAddSong(song) {
  const state = App.state;
  addSong(state.code, {
    videoId: song.videoId,
    title: song.title,
    artist: song.artist,
    thumbnail: song.thumbnail,
    duration: song.duration || 0,
  });
  triggerEnergyBurst();
}

function handleSongEnd(videoId) {
  const state = App.state;
  if (state.nowPlaying) {
    songEnded(state.code, state.nowPlaying.id);
  }
}

function appendChatMessage(message) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  
  const msgEl = document.createElement('div');
  msgEl.className = 'chat-message animate-fadeInUp';
  
  const isMe = message.userId === App.state.userId;
  const color = isMe ? 'var(--neon-cyan)' : 'var(--neon-pink)';
  
  msgEl.innerHTML = `
    <div style="font-family:var(--font-display); font-size: 0.8rem; color:${color}; margin-bottom: 4px; letter-spacing:1px;">
      ${message.userName}
    </div>
    <div style="font-family:var(--font-body);">${message.text}</div>
  `;
  
  container.appendChild(msgEl);
  container.scrollTop = container.scrollHeight;
}

function setupSocketListeners() {
  cleanupListeners();

  const listeners = {
    user_joined: (data) => {
      App.state.users = data.users;
      updateUserBubbles(data.users, App.state);
      showNotification('join', (data.userName || 'Someone') + ' entered the arena');
    },

    user_left: (data) => {
      App.state.users = data.users;
      updateUserBubbles(data.users, App.state);
      if (data.newHostId) {
        App.state.hostId = data.newHostId;
        App.state.isHost = data.newHostId === App.state.userId;
        if (App.state.isHost) {
          showNotification('info', 'YOU ARE NOW THE HOST');
        }
      }
    },

    queue_updated: (data) => {
      App.state.queue = data.queue;
      updateQueueCarousel(data.queue, App.state);
      triggerEnergyBurst();
    },

    vote_confirmed: (data) => {
      App.state.queue = data.queue;
      updateQueueCarousel(data.queue, App.state);
      triggerEnergyBurst();
    },

    now_playing: (data) => {
      App.state.nowPlaying = data.song;
      App.state.playStartedAt = data.playStartedAt || (data.song ? Date.now() : null);
      App.state.currentPosition = null;

      renderNowPlaying(data.song, App.state);

      if (data.song && App.state.playerReady) {
        loadSongWithSync(data.song, App.state.playStartedAt, null);
      }
      renderPlayerControls(App.state);
    },

    position_sync: (data) => {
      if (App.state.isHost) return;
      const player = getPlayer();
      if (!player || !player.getCurrentTime) return;
      const currentVid = getCurrentVideoId();
      if (currentVid !== data.videoId) return;

      const elapsedSinceTick = (Date.now() - data.serverTime) / 1000;
      const expected = (data.position || 0) + elapsedSinceTick;
      const actual = player.getCurrentTime();
      const drift = Math.abs(expected - actual);
      if (drift > DRIFT_THRESHOLD_S) {
        player.seekTo(expected, true);
      }
      App.state.currentPosition = {
        videoId: data.videoId,
        position: data.position,
        updatedAt: data.serverTime,
      };
    },

    user_disconnected: (data) => {
      App.state.users = data.users || App.state.users;
      updateUserBubbles(App.state.users, App.state);
    },

    user_reconnected: (data) => {
      App.state.users = data.users || App.state.users;
      updateUserBubbles(App.state.users, App.state);
    },

    song_skipped: (data) => {
      App.state.queue = data.queue;
      updateQueueCarousel(data.queue, App.state);
      showNotification('skip', 'TRACK VETOED BY DEMOCRACY!');
    },

    host_skip: () => {
      showNotification('info', 'HOST EXERCISED OVERRIDE');
    },

    queue_empty: () => {
      App.state.nowPlaying = null;
      renderNowPlaying(null, App.state);
      renderPlayerControls(App.state);
      showNotification('info', 'QUEUE DEPLETED');
    },

    session_ended: (data) => {
      openStatsModal(data.stats);
      showNotification('info', 'SESSION TERMINATED');
    },

    error: (data) => {
      showNotification('error', data.message);
    },

    chat_message: (message) => {
      appendChatMessage(message);
    },

    ludo_state_update: (gameState) => {
      updateLudoBoard(gameState);
    },
  };

  for (const [event, handler] of Object.entries(listeners)) {
    on(event, handler);
    eventHandlers.push({ event, handler });
  }
}

function cleanupListeners() {
  for (const { event, handler } of eventHandlers) {
    off(event, handler);
  }
  eventHandlers = [];
  if (progressHandler) {
    document.removeEventListener('player-progress', progressHandler);
    progressHandler = null;
  }
  lastHostTickAt = 0;
}

function setupHostPositionTick() {
  if (progressHandler) {
    document.removeEventListener('player-progress', progressHandler);
    progressHandler = null;
  }
  if (!App.state.isHost) return;

  progressHandler = (e) => {
    if (!App.state.isHost) return;
    const { current } = e.detail || {};
    const song = App.state.nowPlaying;
    if (!song || current == null) return;
    const now = Date.now();
    if (now - lastHostTickAt < HOST_TICK_INTERVAL_MS) return;
    lastHostTickAt = now;
    hostPositionTick(App.state.code, song.videoId, current);
  };
  document.addEventListener('player-progress', progressHandler);
}

export { render as renderSession };
