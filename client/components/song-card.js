import { voteSong } from '../services/socket.js';
import App from '../main.js';

export function renderSongCard(song, state, index) {
  const card = document.createElement('div');
  card.className = 'song-card animate-fadeInUp';
  card.style.animationDelay = `${index * 80}ms`;
  card.dataset.songId = song.id;

  if (song.score <= 0) {
    card.classList.add('skip-warning');
  }

  const isUsersSong = song.addedBy === state.userId;
  const addedByUser = state.users.find(u => u.id === song.addedBy);
  const addedByName = addedByUser?.name || 'Unknown';

  let badge = '';
  if (song.status === 'playing') {
    badge = '<span class="song-card-badge song-card-badge-playing">Playing</span>';
  } else if (isUsersSong) {
    badge = '<span class="song-card-badge song-card-badge-yours">Yours</span>';
  } else if (song.score >= 3) {
    badge = '<span class="song-card-badge song-card-badge-hot">Hot</span>';
  }

  card.innerHTML = `
    <img class="song-card-thumbnail" src="${song.thumbnail}" alt="${song.title}" loading="lazy">
    <div class="song-card-body">
      <div class="song-card-meta">
        <div class="song-card-added-by">
          <span>${addedByName}</span>
        </div>
        ${badge}
      </div>
      <h3 class="song-card-title">${song.title}</h3>
      <p class="song-card-artist">${song.artist}</p>
      <div class="vote-bar" data-song-id="${song.id}">
        <button class="vote-btn vote-btn-up" data-direction="1" title="Upvote">▲</button>
        <div class="vote-score-display">
          <div class="vote-score-bar">
            <div class="vote-score-fill ${song.score >= 0 ? 'positive' : 'negative'}" style="width: ${mapScoreToWidth(song.score)}%"></div>
          </div>
          <span class="vote-score-number ${song.score >= 0 ? 'positive' : 'negative'}">${song.score}</span>
        </div>
        <button class="vote-btn vote-btn-down" data-direction="-1" title="Downvote">▼</button>
      </div>
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
    animateVote(card);
  });

  downBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    voteSong(App.state.code, song.id, -1);
    animateVote(card);
  });
}

function animateVote(card) {
  const scoreDisplay = card.querySelector('.vote-score-number');
  if (scoreDisplay) {
    scoreDisplay.style.animation = 'none';
    requestAnimationFrame(() => {
      scoreDisplay.style.animation = 'votePop 300ms cubic-bezier(0.16, 1, 0.3, 1)';
    });
  }
}

function mapScoreToWidth(score) {
  const minScore = -5;
  const maxScore = 10;
  const clamped = Math.max(minScore, Math.min(maxScore, score));
  const normalized = (clamped - minScore) / (maxScore - minScore);
  return normalized * 100;
}
