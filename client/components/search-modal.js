import { searchSongs } from '../services/youtube-search.js';

let onAddCallback = null;
let searchTimeout = null;

export function openSearchModal(onAdd) {
  onAddCallback = onAdd;

  const overlay = document.getElementById('search-modal-overlay');
  const modal = document.getElementById('search-modal');
  overlay.classList.remove('hidden');

  modal.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">Add Song</h2>
      <button class="modal-close" id="search-modal-close">✕</button>
    </div>
    <div class="search-modal-input-wrapper">
      <span class="search-modal-icon">🔍</span>
      <input
        type="text"
        class="search-modal-input"
        id="search-input"
        placeholder="Search YouTube for a song..."
        autofocus
      >
    </div>
    <div class="search-modal-results" id="search-results">
      <div class="search-empty">Type at least 2 characters to search</div>
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
      document.getElementById('search-results').innerHTML = '<div class="search-empty">Type at least 2 characters to search</div>';
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
  resultsContainer.innerHTML = '<div class="search-loading">Searching...</div>';

  const results = await searchSongs(query);

  if (results.length === 0) {
    resultsContainer.innerHTML = '<div class="search-empty">No results found. Try a different search.</div>';
    return;
  }

  resultsContainer.innerHTML = '';
  results.forEach((song) => {
    const item = document.createElement('div');
    item.className = 'search-result-item';

    item.innerHTML = `
      <img class="search-result-thumb" src="${song.thumbnail}" alt="${song.title}" loading="lazy">
      <div class="search-result-info">
        <div class="search-result-title">${song.title}</div>
        <div class="search-result-artist">${song.artist}</div>
      </div>
      <button class="search-result-add">Add</button>
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
