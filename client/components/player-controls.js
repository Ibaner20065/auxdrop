import { togglePlay, setVolume, toggleMute, getPlayer } from '../services/player.js';
import { skipCurrent } from '../services/socket.js';
import App from '../main.js';

export function renderPlayerControls(state) {
  const container = document.getElementById('player-controls-container');
  if (!container) return;

  if (!state.nowPlaying || !state.isHost) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="player-controls">
      <div class="player-actions">
        ${state.isHost ? `
          <button class="btn" id="btn-rewind" title="Rewind 10s">⏪</button>
        ` : ''}
        <button class="btn" id="btn-play-pause">▶</button>
        ${state.isHost ? `
          <button class="btn" id="btn-fastforward" title="Fast Forward 10s">⏩</button>
        ` : ''}
      </div>
      <div class="player-track-info">
        <div style="display:flex; flex-direction:column;">
          <span class="player-title">${state.nowPlaying.title}</span>
          <span class="player-artist">${state.nowPlaying.artist}</span>
        </div>
      </div>
      <div class="player-progress-container" style="display:flex; align-items:center; gap:8px;">
        <span id="player-current-time" style="width:40px; text-align:right;">0:00</span>
        <div class="player-progress-bar" id="player-progress-click-area" style="cursor:pointer; flex:1;">
          <div class="player-progress-fill" id="player-progress-fill" style="width:0%;"></div>
        </div>
        <span id="player-duration" style="width:40px;">0:00</span>
      </div>
      <div class="player-actions">
        <button class="btn" id="btn-volume" title="Volume">🔊</button>
        ${state.isHost ? `
          <button class="btn" id="btn-skip" title="Skip" style="color:var(--accent-red)">⏭</button>
        ` : ''}
      </div>
    </div>
  `;

  attachPlayerEvents();
}

function attachPlayerEvents() {
  document.getElementById('btn-play-pause')?.addEventListener('click', togglePlay);

  if (App.state.isHost) {
    document.getElementById('btn-skip')?.addEventListener('click', () => {
      skipCurrent(App.state.code);
    });

    document.getElementById('btn-rewind')?.addEventListener('click', () => {
      const player = getPlayer();
      if (player) {
        player.seekTo(Math.max(0, player.getCurrentTime() - 10), true);
      }
    });

    document.getElementById('btn-fastforward')?.addEventListener('click', () => {
      const player = getPlayer();
      if (player) {
        player.seekTo(Math.min(player.getDuration(), player.getCurrentTime() + 10), true);
      }
    });

    const progressArea = document.getElementById('player-progress-click-area');
    if (progressArea) {
      progressArea.addEventListener('click', (e) => {
        const rect = progressArea.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const player = getPlayer();
        if (player && player.getDuration) {
          player.seekTo(pos * player.getDuration(), true);
        }
      });
    }
  }

  document.getElementById('btn-volume')?.addEventListener('click', () => {
    const muted = toggleMute();
    const btn = document.getElementById('btn-volume');
    if (btn) btn.textContent = muted ? '🔇' : '🔊';
  });

  document.addEventListener('player-progress', (e) => {
    const { current, duration } = e.detail;
    const currentEl = document.getElementById('player-current-time');
    const durationEl = document.getElementById('player-duration');
    if (currentEl) currentEl.textContent = formatTime(current);
    if (durationEl) durationEl.textContent = formatTime(duration);

    const progressBar = document.getElementById('player-progress-fill');
    if (progressBar && duration > 0) {
      progressBar.style.width = `${(current / duration) * 100}%`;
    }
  });

  document.addEventListener('player-state-change', (e) => {
    const { state: playerState } = e.detail;
    const btn = document.getElementById('btn-play-pause');
    if (btn) {
      if (playerState === 1) { // PLAYING
        btn.textContent = '⏸';
      } else {
        btn.textContent = '▶';
      }
    }
  });
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
