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
    <div class="player-controls visible">
      <button class="player-controls-btn player-controls-btn-play" id="btn-play-pause">
        ▶
      </button>
      <div class="player-controls-track">
        <span class="player-controls-track-title">${state.nowPlaying.title}</span>
        <span class="player-controls-track-artist">${state.nowPlaying.artist}</span>
      </div>
      <div class="player-controls-progress">
        <span class="player-controls-time" id="player-current-time">0:00</span>
        <span class="player-controls-time" id="player-duration">0:00</span>
      </div>
      <button class="player-controls-btn" id="btn-volume" title="Volume">
        🔊
      </button>
      ${state.isHost ? `
        <button class="player-controls-btn" id="btn-skip" title="Skip" style="color:var(--accent-hot)">
          ⏭
        </button>
      ` : ''}
    </div>
  `;

  attachPlayerEvents();
}

function attachPlayerEvents() {
  document.getElementById('btn-play-pause')?.addEventListener('click', togglePlay);

  document.getElementById('btn-skip')?.addEventListener('click', () => {
    skipCurrent(App.state.code);
  });

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

    const progressBar = document.getElementById('now-playing-progress-bar');
    if (progressBar && duration > 0) {
      progressBar.style.width = `${(current / duration) * 100}%`;
    }
  });
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
