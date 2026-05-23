import { searchSongs, getVideoDetails } from '../services/youtube-search.js';

let onAddCallback = null;
let searchTimeout = null;

export function openSearchModal(onAdd) {
  onAddCallback = onAdd;

  const overlay = document.getElementById('search-modal-overlay');
  const modal = document.getElementById('search-modal');
  overlay.classList.remove('hidden');

  modal.innerHTML = `
    <div class="modal-header">
      <h2 class="display">SEARCH DATABASE</h2>
      <button class="btn" id="search-modal-close" style="padding: 4px 8px; border-width: 2px;">✕</button>
    </div>
    <div style="padding: 24px;">
      <div style="display:flex; gap:8px; margin-bottom: 16px;">
        <input
          type="text"
          class="input"
          id="search-input"
          placeholder="SEARCH BY NAME OR URL..."
          autofocus
        >
      </div>
      <div class="search-results" id="search-results" style="max-height: 400px; overflow-y: auto; border: var(--brutal-border); background: rgba(0,0,0,0.5);">
        <div class="mono" style="padding:24px; text-align:center; color: var(--text-muted);">AWAITING INPUT...</div>
      </div>
    </div>
  `;

  setTimeout(() => {
    overlay.classList.add('active');
    document.getElementById('search-input')?.focus();
  }, 10);

  document.getElementById('search-modal-close').addEventListener('click', closeSearchModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSearchModal();
  });

  document.getElementById('search-input').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    if (query.length < 2) {
      document.getElementById('search-results').innerHTML = '<div class="mono" style="padding:24px; text-align:center; color: var(--text-muted);">AWAITING INPUT...</div>';
      return;
    }
    searchTimeout = setTimeout(() => performSearch(query), 300);
  });

  document.addEventListener('keydown', handleSearchKeydown);
}

function closeSearchModal() {
  const overlay = document.getElementById('search-modal-overlay');
  overlay.classList.remove('active');
  setTimeout(() => overlay.classList.add('hidden'), 300);
  document.removeEventListener('keydown', handleSearchKeydown);
  onAddCallback = null;
}

function handleSearchKeydown(e) {
  if (e.key === 'Escape') closeSearchModal();
}

async function performSearch(query) {
  const resultsContainer = document.getElementById('search-results');
  resultsContainer.innerHTML = '<div class="mono" style="padding:24px; text-align:center; color: var(--neon-cyan); animation: pulse 1s infinite;">SEARCHING MAINFRAME...</div>';

  let results = [];
  
  // Check if query is a direct YouTube URL
  const ytMatch = query.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoDetails = await getVideoDetails(ytMatch[1]);
    if (videoDetails) {
      results = [videoDetails];
    }
  } else {
    results = await searchSongs(query);
  }

  if (results.length === 0) {
    resultsContainer.innerHTML = '<div class="mono" style="padding:24px; text-align:center; color: var(--neon-pink);">NO RECORDS FOUND.</div>';
    return;
  }

  resultsContainer.innerHTML = '';
  results.forEach((song) => {
    const item = document.createElement('div');
    item.className = 'search-result-item';

    item.innerHTML = `
      <img class="search-result-art" src="${song.thumbnail}" alt="${song.title}" loading="lazy">
      <div class="search-result-info">
        <div style="font-weight:bold; font-family:var(--font-body);">${song.title}</div>
        <div style="font-size:0.85rem; color:#555;">${song.artist}</div>
      </div>
      <button class="btn btn-secondary search-result-add" style="padding:4px 8px; font-size:0.8rem;">ADD</button>
    `;

    item.querySelector('.search-result-add').addEventListener('click', (e) => {
      e.stopPropagation();
      if (onAddCallback) {
        onAddCallback(song);
        closeSearchModal();
      }
    });

    item.addEventListener('click', () => {
      if (onAddCallback) {
        onAddCallback(song);
        closeSearchModal();
      }
    });

    resultsContainer.appendChild(item);
  });
}
