import App from '../main.js';
import { on, off, addSong, voteSong, skipCurrent, songEnded, getQueue, disconnect, joinSession, sendChatMessage } from '../services/socket.js';
import { initPlayer, loadSong } from '../services/player.js';
import { showNotification } from '../components/notifications.js';
import { renderNowPlaying } from '../components/now-playing.js';
import { renderQueueCarousel, updateQueueCarousel } from '../components/queue-carousel.js';
import { renderSessionHeader } from '../components/session-header.js';
import { renderUserBubbles, updateUserBubbles } from '../components/user-bubbles.js';
import { openSearchModal } from '../components/search-modal.js';
import { openYouTubeImportModal } from '../components/youtube-import.js';
import { renderPlayerControls } from '../components/player-controls.js';
import { openStatsModal } from '../components/stats-modal.js';

const SESSION_SELECTOR = '#view-session';
let eventHandlers = [];

export async function render() {
  const container = document.querySelector(SESSION_SELECTOR);
  const state = App.state;

  container.className = 'view active session';
  container.innerHTML = `
    <div id="album-gradient-bg"></div>
    <div id="session-header-container"></div>
    <div id="youtube-player" style="position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;"></div>
    <main class="session-main">
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
    </main>
    <div id="player-controls-container"></div>
  `;

  renderSessionHeader(state);
  renderUserBubbles(state.users || [], state);
  renderNowPlaying(state.nowPlaying, state);
  renderQueueCarousel(state.queue || [], state);
  renderPlayerControls(state);

  attachSessionEvents();
  setupSocketListeners();

  if (!state.playerReady) {
    initPlayer(
      'youtube-player',
      () => {
        state.playerReady = true;
        console.log('YouTube player ready');
        if (state.nowPlaying) {
          loadSong(state.nowPlaying.videoId);
        }
      },
      // Only the host notifies the server when a song ends
      state.isHost ? handleSongEnd : null
    );
  }

  // Request full queue state from server
  getQueue(state.code);
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

      updateAlbumBackground(data.song);
      renderNowPlaying(data.song, App.state);

      if (data.song) {
        if (App.state.playerReady) {
          loadSong(data.song.videoId);
        } else {
          console.log('Player not ready yet, song will play when ready');
        }
      }
      renderPlayerControls(App.state);
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
}

export { render as renderSession };
