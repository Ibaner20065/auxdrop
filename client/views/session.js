import App from '../main.js';
import { on, off, addSong, voteSong, skipCurrent, songEnded, getQueue, disconnect } from '../services/socket.js';
import { initPlayer, loadSong } from '../services/player.js';
import { showNotification } from '../components/notifications.js';
import { renderNowPlaying } from '../components/now-playing.js';
import { renderQueueCarousel, updateQueueCarousel } from '../components/queue-carousel.js';
import { renderSessionHeader } from '../components/session-header.js';
import { renderUserBubbles, updateUserBubbles } from '../components/user-bubbles.js';
import { openSearchModal } from '../components/search-modal.js';
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
      <section class="queue-section">
        <div class="queue-header" style="background: repeating-linear-gradient(45deg, #ffff00, #ffff00 10px, #000000 10px, #000000 20px);">
          <h2 class="queue-title" style="background:#000; color:#fff; padding:2px 6px;">Queue</h2>
          <button class="queue-add-btn" id="btn-open-search">
            <span>+</span> Add Song
          </button>
        </div>
        <div id="queue-carousel-container"></div>
      </section>
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

  if (state.isHost && !state.playerReady) {
    initPlayer(
      'youtube-player',
      () => {
        state.playerReady = true;
        console.log('YouTube player ready');
        // If a song was queued before player was ready, play it now
        if (state.nowPlaying) {
          loadSong(state.nowPlaying.videoId);
        }
      },
      handleSongEnd
    );
  }

  // Request full queue state from server
  getQueue(state.code);
}

function attachSessionEvents() {
  document.getElementById('btn-open-search')?.addEventListener('click', () => {
    openSearchModal(handleAddSong);
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

function setupSocketListeners() {
  cleanupListeners();

  const listeners = {
    user_joined: (data) => {
      App.state.users = data.users;
      updateUserBubbles(data.users, App.state);
      showNotification('join', `${data.userName || 'Someone'} joined the session`);
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
      console.log('Now playing event received:', data.song?.title, 'playerReady:', App.state.playerReady);
      App.state.nowPlaying = data.song;
      
      const bgElement = document.getElementById('album-gradient-bg');
      if (bgElement) {
        if (data.song && data.song.thumbnail) {
          bgElement.style.backgroundImage = \`url(\${data.song.thumbnail})\`;
        } else {
          bgElement.style.backgroundImage = 'none';
        }
      }

      renderNowPlaying(data.song, App.state);
      if (App.state.isHost && data.song) {
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
      showNotification('info', 'Host skipped the current song');
    },

    queue_empty: () => {
      App.state.nowPlaying = null;
      renderNowPlaying(null, App.state);
      showNotification('info', 'Queue is empty — add some songs!');
    },

    session_ended: (data) => {
      openStatsModal(data.stats);
      showNotification('info', 'Session has ended');
    },

    error: (data) => {
      showNotification('error', data.message);
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
