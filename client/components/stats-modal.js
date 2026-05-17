export function openStatsModal(stats) {
  if (!stats) return;

  const overlay = document.getElementById('stats-modal-overlay');
  const modal = document.getElementById('stats-modal');
  overlay.classList.remove('hidden');

  const duration = stats.sessionDuration
    ? formatDuration(stats.sessionDuration)
    : 'Unknown';

  modal.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">Session Summary</h2>
      <button class="modal-close" id="stats-modal-close">✕</button>
    </div>
    <div class="stats-grid" style="background:#000; padding:16px; border:var(--border-inset); border-color:var(--color-inset);">
      <div class="stat-item" style="background:transparent; border:none;">
        <div class="stat-value" style="color:#0f0;">${String(stats.totalSongsPlayed || 0).padStart(4, '0')}</div>
        <div class="stat-label" style="color:#0f0;">Songs Played</div>
      </div>
      <div class="stat-item" style="background:transparent; border:none;">
        <div class="stat-value" style="color:#0f0;">${String(stats.totalVotesCast || 0).padStart(4, '0')}</div>
        <div class="stat-label" style="color:#0f0;">Votes Cast</div>
      </div>
      <div class="stat-item" style="background:transparent; border:none;">
        <div class="stat-value" style="color:#0f0;">${String(stats.totalSongsAdded || 0).padStart(4, '0')}</div>
        <div class="stat-label" style="color:#0f0;">Songs Added</div>
      </div>
      <div class="stat-item" style="background:transparent; border:none;">
        <div class="stat-value" style="color:#0f0;">${duration}</div>
        <div class="stat-label" style="color:#0f0;">Duration</div>
      </div>


      ${stats.djCrown ? `
        <div class="stat-item stat-full stat-crown" style="background:transparent; border:none; margin-top:8px; border-top:1px dashed #0f0; padding-top:16px;">
          <div class="stat-value" style="font-size:1.1rem; color:#0f0;">
            👑 ${stats.djCrown.name || 'Unknown'}
          </div>
          <div class="stat-label" style="color:#0f0;">DJ Crown — Most songs played (${stats.djCrown.count})</div>
        </div>
      ` : ''}

      ${stats.vibeKiller ? `
        <div class="stat-item stat-full" style="background:transparent; border:none;">
          <div class="stat-value" style="font-size:1rem; color:#0f0;">
            😈 ${stats.vibeKiller.name || 'Unknown'}
          </div>
          <div class="stat-label" style="color:#0f0;">Vibe Killer — Most songs skipped (${stats.vibeKiller.count})</div>
        </div>
      ` : ''}

      ${stats.mostControversial ? `
        <div class="stat-item stat-full" style="background:transparent; border:none;">
          <div class="stat-value" style="font-size:1rem; color:#0f0;">
            "${stats.mostControversial.title}"
          </div>
          <div class="stat-label" style="color:#0f0;">Most Controversial — ${stats.mostControversial.totalVotes} total votes</div>
        </div>
      ` : ''}
    </div>
    <button class="btn btn-primary" id="btn-stats-close" style="width:100%;">
      Close
    </button>
  `;

  setTimeout(() => overlay.classList.add('active'), 10);

  const close = () => {
    overlay.classList.remove('active');
    setTimeout(() => overlay.classList.add('hidden'), 300);
  };

  document.getElementById('stats-modal-close').addEventListener('click', close);
  document.getElementById('btn-stats-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
}

function formatDuration(ms) {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}
