import App from '../main.js';
import { on, off, addSong, voteSong, skipCurrent, songEnded, getQueue, disconnect, joinSession, sendChatMessage, ludoJoin, hostPositionTick } from '../services/socket.js';
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
  // Prefer the most recent currentPosition if it's for this song; otherwise fall back to playStartedAt elapsed.
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
    <div id="album-gradient-bg"></div>
    <div id="session-header-container"></div>
    <div id="youtube-player" style="position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;"></div>
    <main class="session-main">
      <div id="session-tabs-nav" style="display:flex; gap:10px; margin-bottom:1rem; padding: 0.5rem; background: var(--bg-primary); border-bottom: var(--border-outset);">
        <button class="btn btn-secondary tab-btn active" data-target="tab-music">🎵 Music Queue</button>
        <button class="btn btn-secondary tab-btn" data-target="tab-snakes">🐍 Snakes & Ladders</button>
        <button class="btn btn-secondary tab-btn" data-target="tab-ludo">🎲 Ludo</button>
      </div>

      <!-- MUSIC TAB -->
      <div id="tab-music" class="session-tab-content active" style="display:block;">
      <div class="marquee-container">
        <span class="marquee-text" style="color:var(--accent-red); font-weight:bold;">✨ WELCOME TO AUXDROP ✨ ADD SONGS TO THE QUEUE AND UPVOTE YOUR FAVORITES! ✨ </span>
        <span class="marquee-text" style="color:var(--accent-yellow); font-weight:bold;">🔥 THE DEMOCRATIC AUX CORD 🔥 </span>
        <span class="marquee-text" style="color:var(--accent-blue); font-weight:bold;">🎵 NO BAD VIBES ALLOWED 🎵 </span>
      </div>
      <div id="now-playing-container"></div>
      <div class="session-split-layout" style="display:flex; gap:16px; flex-wrap:wrap;">
        <section class="queue-section" style="flex:2; min-width:300px;">
          <div class="queue-header" style="background: repeating-linear-gradient(45deg, #ffff00, #ffff00 10px, #000000 10px, #000000 20px);">
            <h2 class="queue-title" style="background:#000; color:#fff; padding:2px 6px;">Queue</h2>
            <div style="display:flex; gap:6px;">
              <button class="queue-add-btn" id="btn-open-search">
                <span>+</span> Add Song
              </button>
              <button class="queue-add-btn" id="btn-open-yt" style="background:#FF0000; border-color:#FF0000; color:#FFF;">
                ▶️ YT Playlist
              </button>
            </div>
          </div>
          <div id="queue-carousel-container"></div>
        </section>
        <section class="chat-section" style="flex:1; min-width:280px; display:flex; flex-direction:column; background:var(--bg-primary); border:var(--border-outset); border-color:var(--color-outset);">
          <div class="chat-header" style="background: linear-gradient(to right, var(--title-bar), var(--title-bar-end)); color: white; padding: 8px;">
            <h2 class="chat-title" style="font-family: var(--font-heading); margin: 0; font-size: 1.2rem; text-transform: uppercase;">Chat</h2>
          </div>
          <div id="chat-messages" style="flex:1; height:300px; overflow-y:auto; background:white; border:var(--border-inset); border-color:var(--color-inset); margin:var(--space-2); padding:var(--space-2); display:flex; flex-direction:column; gap:4px;">
            <div style="color:var(--text-muted); text-align:center; font-style:italic; font-size:0.9rem;">Welcome to the chat!</div>
          </div>
          <div class="chat-input-container" style="display:flex; padding:var(--space-2); gap:var(--space-2); padding-top:0;">
            <input type="text" id="chat-input" class="input" style="margin-bottom:0; flex:1;" placeholder="Say something..." maxlength="200" />
            <button id="btn-send-chat" class="btn btn-primary" style="padding:0 var(--space-3);">Send</button>
          </div>
        </section>
      </div>
      </div> <!-- End Music Tab -->

      <!-- SNAKES & LADDERS TAB -->
      <div id="tab-snakes" class="session-tab-content" style="display:none; text-align:center; padding: 2rem;">
        <h2 style="font-family: var(--font-heading); color: var(--accent-green); font-size: 2rem;">🐍 Snakes & Ladders 🪜</h2>
        <div style="background: white; border: var(--border-inset); border-color: var(--color-inset); width: 80%; max-width: 600px; height: 400px; margin: 1rem auto; display: flex; align-items: center; justify-content: center; font-family: var(--font-mono); color: #666;">
          [ Game Board Coming Soon ]
        </div>
        <p>Race to square 100! But watch out for the snakes.</p>
        <button class="btn btn-primary" style="font-size: 1.2rem; margin-top: 1rem;" disabled>Roll Dice</button>
      </div>

      <!-- LUDO TAB -->
      <div id="tab-ludo" class="session-tab-content" style="display:none; padding: 2rem;">
        <!-- Ludo Board gets rendered here -->
      </div>

    </main>
    <div id="player-controls-container"></div>
  `;

  renderSessionHeader(state);
  renderUserBubbles(state.users || [], state);
  renderNowPlaying(state.nowPlaying, state);
  renderQueueCarousel(state.queue || [], state);
  renderPlayerControls(state);
  
  // Render Board Games
  renderLudoBoard(document.getElementById('tab-ludo'));

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
      // Only the host notifies the server when a song ends
      state.isHost ? handleSongEnd : null
    );
  } else if (state.nowPlaying) {
    // Player already initialized (e.g. after rejoin) — load with sync
    loadSongWithSync(state.nowPlaying, state.playStartedAt, state.currentPosition);
  }

  // Wire host playback-position broadcast (host only, throttled)
  setupHostPositionTick();

  // Request full queue state from server
  getQueue(state.code);

  // Switch to initial tab if provided
  if (state.initialTab) {
    switchTab('tab-' + state.initialTab);
    
    // Auto-join if it's a dedicated ludo party
    if (state.initialTab === 'ludo') {
      setTimeout(() => {
        ludoJoin(state.code).catch(err => console.error("Auto-join Ludo failed:", err));
      }, 500); // slight delay to let socket establish fully
    }
  }
}

function switchTab(targetId) {
  document.querySelectorAll('.session-tab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active', 'btn-primary'));
  
  const targetEl = document.getElementById(targetId);
  if (targetEl) targetEl.style.display = 'block';
  
  const btnEl = document.querySelector(`.tab-btn[data-target="${targetId}"]`);
  if (btnEl) btnEl.classList.add('active', 'btn-primary');
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
  };
  
  btnSendChat?.addEventListener('click', handleSendChat);
  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSendChat();
  });

  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      switchTab(e.target.getAttribute('data-target'));
    });
  });
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
}

function handleSongEnd(videoId) {
  const state = App.state;
  if (state.nowPlaying) {
    songEnded(state.code, state.nowPlaying.id);
  }
}

function updateAlbumBackground(song) {
  const bgElement = document.getElementById('album-gradient-bg');
  if (!bgElement) return;
  if (song && song.thumbnail) {
    bgElement.style.backgroundImage = 'url(' + song.thumbnail + ')';
  } else {
    bgElement.style.backgroundImage = 'none';
  }
}

function appendChatMessage(message) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  
  const msgEl = document.createElement('div');
  msgEl.className = 'chat-message';
  msgEl.style.cssText = 'padding: 4px; border-bottom: 1px dotted #ccc; word-wrap: break-word; font-size: 0.95rem;';
  
  const isMe = message.userId === App.state.userId;
  const color = isMe ? 'var(--accent-blue)' : 'var(--title-bar)';
  
  msgEl.innerHTML = `
    <strong style="color:${color}; font-family:var(--font-heading); margin-right:4px;">${message.userName}:</strong>
    <span style="font-family:var(--font-body);">${message.text}</span>
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
      showNotification('join', (data.userName || 'Someone') + ' joined the session');
    },

    user_left: (data) => {
      App.state.users = data.users;
      updateUserBubbles(data.users, App.state);
      if (data.newHostId) {
        App.state.hostId = data.newHostId;
        App.state.isHost = data.newHostId === App.state.userId;
        if (App.state.isHost) {
          showNotification('info', 'You are now the host');
        }
      }
    },

    queue_updated: (data) => {
      App.state.queue = data.queue;
      updateQueueCarousel(data.queue, App.state);
    },

    vote_confirmed: (data) => {
      App.state.queue = data.queue;
      updateQueueCarousel(data.queue, App.state);
    },

    now_playing: (data) => {
      console.log('Now playing event received:', data.song ? data.song.title : 'nothing', 'playerReady:', App.state.playerReady);
      App.state.nowPlaying = data.song;
      App.state.playStartedAt = data.playStartedAt || (data.song ? Date.now() : null);
      App.state.currentPosition = null; // reset on song change

      updateAlbumBackground(data.song);
      renderNowPlaying(data.song, App.state);

      if (data.song) {
        if (App.state.playerReady) {
          loadSongWithSync(data.song, App.state.playStartedAt, null);
        } else {
          console.log('Player not ready yet, song will play when ready');
        }
      }
      renderPlayerControls(App.state);
    },

    position_sync: (data) => {
      // Guests adjust to host playback if drift > threshold
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
        console.log(`[sync] drift ${drift.toFixed(2)}s — seeking to ${expected.toFixed(2)}s`);
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
      showNotification('skip', 'A song was democratically skipped!');
    },

    host_skip: () => {
      showNotification('info', 'Host skipped the current track');
    },

    queue_empty: () => {
      App.state.nowPlaying = null;
      updateAlbumBackground(null);
      renderNowPlaying(null, App.state);
      renderPlayerControls(App.state);
      showNotification('info', 'Queue is empty — add some songs!');
    },

    session_ended: (data) => {
      openStatsModal(data.stats);
      showNotification('info', 'Session has ended');
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

  window.__sessionListeners = listeners;
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
