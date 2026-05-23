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
    <div class="bottom-player">
      <div style="display:flex; gap: 8px;">
        <button class="btn" id="btn-rewind" style="padding: 8px; border-width: 2px;">⏪</button>
        <button class="btn btn-primary" id="btn-play-pause" style="padding: 8px 16px; border-width: 2px;">⏸</button>
        <button class="btn" id="btn-fastforward" style="padding: 8px; border-width: 2px;">⏩</button>
      </div>
      
      <div style="flex:1; display:flex; flex-direction:column; gap:4px; max-width: 500px; margin: 0 auto;">
         <div style="display:flex; justify-content:space-between; font-family:var(--font-mono); font-size:0.8rem; color:var(--text-muted);">
            <span id="player-current-time">0:00</span>
            <span id="player-duration">0:00</span>
         </div>
         <div class="player-progress-bar" id="player-progress-click-area">
            <div class="player-progress-fill" id="player-progress-fill"></div>
         </div>
      </div>
      
      <div style="display:flex; gap: 8px;">
        <button class="btn" id="btn-volume" style="padding: 8px; border-width: 2px;">🔊</button>
        <button class="btn" id="btn-skip" style="padding: 8px; border-width: 2px; border-color:var(--neon-pink); color:var(--neon-pink);">⏭ VETO</button>
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
      progressBar.style.width = \`\${(current / duration) * 100}%\`;
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
  return \`\${m}:\${s.toString().padStart(2, '0')}\`;
}
