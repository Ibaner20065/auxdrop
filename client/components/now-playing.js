export function renderNowPlaying(song, state) {
  const container = document.getElementById('now-playing-container');
  if (!container) return;

  if (!song) {
    if (!localStorage.getItem('themeOverride')) {
      document.body.classList.remove('dark-mode');
    }
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn && !localStorage.getItem('themeOverride')) {
      themeBtn.textContent = '🌙';
    }
    container.innerHTML = `
      <div class="now-playing-header">Media Player</div>
      <div class="now-playing-content" style="align-items:center; justify-content:center; flex-direction:column;">
        <div style="font-size:3rem;">♫</div>
        <div style="font-family:var(--font-heading); font-size:1.5rem;">Waiting for songs...</div>
      </div>
    `;
    return;
  }

  if (!localStorage.getItem('themeOverride')) {
    document.body.classList.add('dark-mode');
  }
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn && !localStorage.getItem('themeOverride')) {
    themeBtn.textContent = '☀️';
  }

  const isUsersSong = song.addedBy === state.userId;
  const addedByUser = state.users.find(u => u.id === song.addedBy);
  const addedByName = addedByUser?.name || 'Unknown';

  container.innerHTML = `
    <div class="now-playing-header">
      Now Playing <span class="badge animate-pulse" style="background:#ff0000; color:#fff; border-color:#ff5555 #800000 #800000 #ff5555; margin-left:8px;">HOT!</span>
    </div>
    <div class="now-playing-content">
      <img class="now-playing-art" src="${song.thumbnail}" alt="${song.title}" loading="lazy">
      <div class="now-playing-info">
        <h2 class="now-playing-title">${song.title}</h2>
        <p class="now-playing-artist">${song.artist}</p>
        <div class="now-playing-meta">
          <span>Added by: <strong style="color:var(--accent-blue)">${addedByName}</strong></span>
          ${isUsersSong ? '<span class="badge" style="margin-left:8px; background:var(--accent-yellow)">YOUR SONG</span>' : ''}
        </div>
        ${state.isHost ? `
          <div style="margin-top:16px;">
            <button class="btn btn-secondary" id="btn-skip-host" style="font-size:0.8rem; padding:4px 8px;">
              ⏭ Skip Track
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  document.getElementById('btn-skip-host')?.addEventListener('click', () => {
    import('../services/socket.js').then(({ skipCurrent }) => {
      skipCurrent(state.code);
    });
  });
}

export function updateProgress(percent) {
  const bar = document.getElementById('now-playing-progress-bar');
  if (bar) {
    bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  }
}
