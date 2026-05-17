import { voteSong } from '../services/socket.js';
import App from '../main.js';

export function renderVoteBar(songId, score, container) {
  const bar = document.createElement('div');
  bar.className = 'vote-bar';
  bar.dataset.songId = songId;

  bar.innerHTML = `
    <button class="vote-btn vote-btn-up" data-direction="1" title="Upvote">▲</button>
    <div class="vote-score-display">
      <div class="vote-score-bar">
        <div class="vote-score-fill ${score >= 0 ? 'positive' : 'negative'}" style="width: ${mapScoreToWidth(score)}%"></div>
      </div>
      <span class="vote-score-number ${score >= 0 ? 'positive' : 'negative'}">${score}</span>
    </div>
    <button class="vote-btn vote-btn-down" data-direction="-1" title="Downvote">▼</button>
  `;

  bar.querySelector('.vote-btn-up').addEventListener('click', (e) => {
    e.stopPropagation();
    voteSong(App.state.code, songId, 1);
    animateVoteNumber(bar);
  });

  bar.querySelector('.vote-btn-down').addEventListener('click', (e) => {
    e.stopPropagation();
    voteSong(App.state.code, songId, -1);
    animateVoteNumber(bar);
  });

  if (container) {
    container.appendChild(bar);
  }

  return bar;
}

export function updateVoteBar(bar, score) {
  const fill = bar.querySelector('.vote-score-fill');
  const number = bar.querySelector('.vote-score-number');

  if (fill) {
    fill.style.width = `${mapScoreToWidth(score)}%`;
    fill.className = `vote-score-fill ${score >= 0 ? 'positive' : 'negative'}`;
  }

  if (number) {
    number.textContent = score;
    number.className = `vote-score-number ${score >= 0 ? 'positive' : 'negative'}`;
    number.style.animation = 'none';
    requestAnimationFrame(() => {
      number.style.animation = 'votePop 300ms cubic-bezier(0.16, 1, 0.3, 1)';
    });
  }
}

function animateVoteNumber(bar) {
  const number = bar.querySelector('.vote-score-number');
  if (number) {
    number.style.animation = 'none';
    requestAnimationFrame(() => {
      number.style.animation = 'votePop 300ms cubic-bezier(0.16, 1, 0.3, 1)';
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
