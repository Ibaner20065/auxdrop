import { voteSong, moveSong } from '../services/socket.js';
import App from '../main.js';

export function renderSongCard(song, state, index) {
  const card = document.createElement('div');
  card.className = 'song-card animate-fadeInUp';
  if (song.score >= 3) card.classList.add('hot');
  card.style.animationDelay = \`\${index * 50}ms\`;
  card.dataset.songId = song.id;

  const addedByUser = state.users.find(u => u.id === song.addedBy);
  const addedByName = addedByUser?.name || 'UNKNOWN';

  card.innerHTML = `
    ${state.isHost ? `
      <div class="reorder-overlay" style="display:none; position:absolute; inset:0; background:rgba(0,0,0,0.9); z-index:10; align-items:center; justify-content:center; gap:16px;">
        <button class="btn btn-reorder-up" style="padding:12px; border-color:var(--neon-cyan); color:var(--neon-cyan);">⬆️ MOVE UP</button>
        <button class="btn btn-reorder-down" style="padding:12px; border-color:var(--neon-pink); color:var(--neon-pink);">⬇️ MOVE DOWN</button>
        <button class="btn btn-reorder-close" style="padding:12px;">✕ CLOSE</button>
      </div>
    ` : ''}
    
    <img class="song-art" src="${song.thumbnail}" alt="${song.title}" loading="lazy">
    
    <div class="song-info">
      <h3 class="song-title">${song.title}</h3>
      <p class="song-artist">${song.artist}</p>
      <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
        BY ${addedByName.toUpperCase()}
      </div>
    </div>
    
    <div class="vote-bar" data-song-id="${song.id}">
      <button class="vote-btn vote-btn-up" data-direction="1" title="Upvote">▲</button>
      <span class="vote-score ${song.score >= 0 ? 'positive' : 'negative'}">${song.score}</span>
      <button class="vote-btn vote-btn-down" data-direction="-1" title="Downvote">▼</button>
    </div>
  `;

  attachVoteEvents(card, song);
  return card;
}

function attachVoteEvents(card, song) {
  const upBtn = card.querySelector('.vote-btn-up');
  const downBtn = card.querySelector('.vote-btn-down');

  upBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    voteSong(App.state.code, song.id, 1);
    animateVote(card, 'up');
  });

  downBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    voteSong(App.state.code, song.id, -1);
    animateVote(card, 'down');
  });

  if (App.state.isHost) {
    let longPressTimer;
    const overlay = card.querySelector('.reorder-overlay');
    const startPress = () => {
      longPressTimer = setTimeout(() => overlay.style.display = 'flex', 500);
    };
    const cancelPress = () => clearTimeout(longPressTimer);

    card.addEventListener('mousedown', startPress);
    card.addEventListener('touchstart', startPress, { passive: true });
    card.addEventListener('mouseup', cancelPress);
    card.addEventListener('mouseleave', cancelPress);
    card.addEventListener('touchend', cancelPress);
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      overlay.style.display = 'flex';
    });

    card.querySelector('.btn-reorder-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      overlay.style.display = 'none';
    });
    card.querySelector('.btn-reorder-up')?.addEventListener('click', (e) => {
      e.stopPropagation();
      moveSong(App.state.code, song.id, 'up');
      overlay.style.display = 'none';
    });
    card.querySelector('.btn-reorder-down')?.addEventListener('click', (e) => {
      e.stopPropagation();
      moveSong(App.state.code, song.id, 'down');
      overlay.style.display = 'none';
    });
  }
}

function animateVote(card, direction) {
  const scoreDisplay = card.querySelector('.vote-score');
  if (scoreDisplay) {
    scoreDisplay.style.transform = direction === 'up' ? 'translateY(-10px)' : 'translateY(10px)';
    setTimeout(() => {
      scoreDisplay.style.transform = 'translateY(0)';
    }, 200);
  }
}
