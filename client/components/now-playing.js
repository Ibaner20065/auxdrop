export function renderNowPlaying(song, state) {
  const container = document.getElementById('now-playing-container');
  if (!container) return;

  if (!song) {
    container.innerHTML = `
      <div class="now-playing-hero" style="justify-content: center; align-items: center; min-height: 250px;">
        <div style="text-align: center;">
          <div style="font-size: 4rem; color: var(--neon-pink); margin-bottom: 16px; animation: pulse 2s infinite;">♫</div>
          <h2 class="display" style="font-size: 2rem; color: var(--text-muted);">AWAITING TRANSMISSION</h2>
        </div>
      </div>
    `;
    return;
  }

  const isUsersSong = song.addedBy === state.userId;
  const addedByUser = state.users.find(u => u.id === song.addedBy);
  const addedByName = addedByUser?.name || 'UNKNOWN';

  container.innerHTML = `
    <div class="now-playing-hero animate-fadeInUp">
      <div class="np-art-wrapper">
        <img class="np-art" src="${song.thumbnail}" alt="${song.title}">
        <div class="np-art-overlay"></div>
      </div>
      
      <div class="np-info">
        <div class="np-label">
          <div class="pulse-dot"></div>
          NOW PLAYING IN THE ARENA
        </div>
        
        <h2 class="np-title">${song.title}</h2>
        <p class="np-artist">${song.artist}</p>
        
        <div style="margin-top: 24px; display: flex; gap: 12px; align-items: center;">
          <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 8px 16px; font-family: var(--font-mono); font-size: 0.85rem;">
            BROUGHT BY <strong style="color: var(--neon-cyan);">${addedByName.toUpperCase()}</strong>
          </div>
          
          ${isUsersSong ? '<div style="background: var(--neon-pink); color: #fff; padding: 8px 16px; font-family: var(--font-display); font-size: 0.85rem; box-shadow: 2px 2px 0 #000;">YOUR DROP</div>' : ''}
        </div>
        
        ${state.isHost ? `
          <div style="margin-top:24px;">
            <button class="btn btn-primary" id="btn-skip-host" style="font-size:0.8rem; padding:8px 16px;">
              VETO TRACK
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
  const bar = document.getElementById('player-progress-fill');
  if (bar) {
    bar.style.width = \`\${Math.min(100, Math.max(0, percent))}%\`;
  }
}
