import { renderSongCard } from './song-card.js';

export function renderQueueCarousel(queue, state) {
  const container = document.getElementById('queue-carousel-container');
  if (!container) return;

  if (queue == null) {
    // Not fetched yet — show shimmer skeletons
    container.innerHTML = `
      <div class="queue-carousel queue-loading">
        ${Array(3).fill(0).map(() => `
          <div class="queue-skeleton-card">
            <div class="queue-skeleton-art"></div>
            <div class="queue-skeleton-lines">
              <div class="queue-skeleton-line wide"></div>
              <div class="queue-skeleton-line narrow"></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    return;
  }

  if (queue.length === 0) {
    container.innerHTML = `
      <div class="queue-empty">
        <div class="queue-empty-icon">🎵</div>
        <div class="queue-empty-text">No songs in queue</div>
        <div class="queue-empty-sub">Click "Add Song" to search YouTube</div>
      </div>
    `;
    return;
  }

  const carousel = document.createElement('div');
  carousel.className = 'queue-carousel';

  queue.forEach((song, index) => {
    const card = renderSongCard(song, state, index);
    card.style.animationDelay = `${index * 80}ms`;
    carousel.appendChild(card);
  });

  container.innerHTML = '';
  container.appendChild(carousel);

  initDragScroll(carousel);
}

export function updateQueueCarousel(queue, state) {
  renderQueueCarousel(queue, state);
}

function initDragScroll(carousel) {
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;

  carousel.addEventListener('mousedown', (e) => {
    isDown = true;
    carousel.classList.add('active');
    startX = e.pageX - carousel.offsetLeft;
    scrollLeft = carousel.scrollLeft;
  });

  carousel.addEventListener('mouseleave', () => {
    isDown = false;
    carousel.classList.remove('active');
  });

  carousel.addEventListener('mouseup', () => {
    isDown = false;
    carousel.classList.remove('active');
  });

  carousel.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - carousel.offsetLeft;
    const walk = (x - startX) * 1.5;
    carousel.scrollLeft = scrollLeft - walk;
  });
}
