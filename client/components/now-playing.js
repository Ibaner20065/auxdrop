export function renderNowPlaying(song, state) {
  const container = document.getElementById('now-playing-container');
  if (!container) return;

  if (!song) {
    container.innerHTML = `
      <div class="now-playing">
        <div class="now-playing-empty">
          <div class="now-playing-empty-icon">♫</div>
          <div class="now-playing-empty-text">Waiting for songs...</div>
          <div class="now-playing-empty-sub">Add a song to get the party started</div>
        </div>
      </div>
    `;
    return;
  }

  const isUsersSong = song.addedBy === state.userId;
  const addedByUser = state.users.find(u => u.id === song.addedBy);
  const addedByName = addedByUser?.name || 'Unknown';

  container.innerHTML = `
    <div class="now-playing animate-fadeIn">
      <div class="now-playing-content">
        <div class="now-playing-thumbnail-wrapper">
          <img class="now-playing-thumbnail" src="${song.thumbnail}" alt="${song.title}" loading="lazy">
        </div>
        <div class="now-playing-info">
          <div class="now-playing-label">Now Playing</div>
          <h2 class="now-playing-title">${song.title}</h2>
          <p class="now-playing-artist">${song.artist}</p>
          <div class="now-playing-added-by">
            <span>Added by</span>
            <span style="color:var(--text-secondary)">${addedByName}</span>
            ${isUsersSong ? '<span class="song-card-badge song-card-badge-yours" style="font-size:0.7rem;margin-left:4px;">Your Song</span>' : ''}
          </div>
          <div class="now-playing-progress">
            <div class="now-playing-progress-bar" id="now-playing-progress-bar" style="width:0%"></div>
          </div>
          ${state.isHost ? `
            <div class="now-playing-actions">
              <button class="btn btn-secondary" id="btn-skip-host" style="font-size:0.8rem;">
                ⏭ Skip
              </button>
            </div>
          ` : ''}
        </div>
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
