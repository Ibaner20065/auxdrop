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
      <h2 class="modal-title">Search YouTube</h2>
      <button class="modal-close" id="search-modal-close">✕</button>
    </div>
    <div class="modal-body">
      <div style="display:flex; gap:8px;">
        <input
          type="text"
          class="input"
          id="search-input"
          placeholder="Search by name, artist, or paste YouTube link..."
          style="margin:0;"
          autofocus
        >
      </div>
      <div class="search-results" id="search-results">
        <div style="padding:16px; text-align:center;">Type at least 2 characters to search...</div>
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
      document.getElementById('search-results').innerHTML = '<div style="padding:16px; text-align:center;">Type at least 2 characters to search...</div>';
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
    resultsContainer.innerHTML = '<div style="padding:16px; text-align:center;">No results found. Try a different search.</div>';
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
