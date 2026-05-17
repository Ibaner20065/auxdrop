import {
  isConfigured,
  getToken,
  clearToken,
  openAuthPopup,
  getMyPlaylists,
  getPlaylistTracks,
} from '../services/spotify.js';
import { searchSongs } from '../services/youtube-search.js';

export async function openSpotifyImportModal(onAddSong) {
  const overlay = document.getElementById('search-modal-overlay');
  const modal = document.getElementById('search-modal');

  overlay.classList.remove('hidden');
  setTimeout(() => overlay.classList.add('active'), 10);

  const closeModal = () => {
    overlay.classList.remove('active');
    setTimeout(() => overlay.classList.add('hidden'), 300);
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  }, { once: true });

  if (!isConfigured()) {
    modal.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">🎵 Import Spotify Playlist</h2>
        <button class="modal-close" id="spotify-modal-close">✕</button>
      </div>
      <div class="modal-body" style="text-align:center; padding:32px;">
        <p style="margin-bottom:12px; font-weight:bold; color:var(--accent-red);">
          Spotify integration is not configured.
        </p>
        <p style="font-size:0.85rem;">
          Add <code>VITE_SPOTIFY_CLIENT_ID</code> to your <code>client/.env</code> file
          and redeploy to enable this feature.
        </p>
      </div>
    `;
    document.getElementById('spotify-modal-close').addEventListener('click', closeModal);
    return;
  }

  const renderShell = (bodyHtml) => {
    modal.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">🎵 Import Spotify Playlist</h2>
        <button class="modal-close" id="spotify-modal-close">✕</button>
      </div>
      <div class="modal-body" id="spotify-modal-body">${bodyHtml}</div>
    `;
    document.getElementById('spotify-modal-close').addEventListener('click', closeModal);
  };

  // --- Step 1: Connect ---
  let token = getToken();
  if (!token) {
    renderShell(`
      <div style="text-align:center; padding:32px;">
        <div style="font-size:2.5rem; margin-bottom:8px;">🎧</div>
        <p style="margin-bottom:16px; font-weight:bold;">Connect your Spotify account</p>
        <p style="font-size:0.85rem; color:#555; margin-bottom:20px;">
          We'll fetch your playlists and match each song to YouTube automatically.
        </p>
        <button class="btn" id="btn-spotify-connect"
          style="background:#1DB954; border-color:#1DB954; color:#000; font-weight:bold; padding:10px 24px;">
          Connect Spotify
        </button>
      </div>
    `);

    document.getElementById('btn-spotify-connect').addEventListener('click', async () => {
      document.getElementById('btn-spotify-connect').textContent = 'Waiting for Spotify...';
      document.getElementById('btn-spotify-connect').disabled = true;
      try {
        token = await openAuthPopup();
        await showPlaylists(token, closeModal, onAddSong);
      } catch (err) {
        renderShell(`
          <div style="text-align:center; padding:32px; color:var(--accent-red);">
            <p>${err.message || 'Connection failed'}.</p>
            <button class="btn" id="btn-retry" style="margin-top:12px;">Try Again</button>
          </div>
        `);
        document.getElementById('btn-retry').addEventListener('click', () => openSpotifyImportModal(onAddSong));
      }
    });
    return;
  }

  // Already connected
  await showPlaylists(token, closeModal, onAddSong);
}

async function showPlaylists(token, closeModal, onAddSong) {
  const body = document.getElementById('spotify-modal-body');
  body.innerHTML = `<div style="text-align:center; padding:24px;">Loading your playlists...</div>`;

  try {
    const playlists = await getMyPlaylists(token);

    if (!playlists.length) {
      body.innerHTML = `<div style="padding:24px; text-align:center;">No playlists found on your Spotify account.</div>`;
      return;
    }

    body.innerHTML = `
      <p style="font-size:0.85rem; color:#555; margin-bottom:10px;">
        Select a playlist — first <strong>30 tracks</strong> will be matched on YouTube.
      </p>
      <div style="max-height:360px; overflow-y:auto;">
        ${playlists.map(p => `
          <div class="search-result-item" data-id="${p.id}" data-name="${encodeURIComponent(p.name)}" style="cursor:pointer;">
            <img class="search-result-art"
              src="${p.images?.[0]?.url || ''}"
              alt="${p.name}"
              style="width:52px;height:52px;object-fit:cover;"
              onerror="this.style.display='none'">
            <div class="search-result-info">
              <div style="font-weight:bold;">${p.name}</div>
              <div style="font-size:0.8rem; color:#555;">${p.tracks.total} tracks</div>
            </div>
            <button class="btn" style="padding:4px 12px; font-size:0.8rem; background:#1DB954; border-color:#1DB954; color:#000;">
              Import
            </button>
          </div>
        `).join('')}
      </div>
      <div style="margin-top:12px; text-align:right;">
        <button class="btn" id="btn-spotify-logout" style="font-size:0.75rem; color:#888;">
          Disconnect Spotify
        </button>
      </div>
    `;

    document.getElementById('btn-spotify-logout').addEventListener('click', () => {
      clearToken();
      openSpotifyImportModal(onAddSong);
    });

    body.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', async () => {
        const id = item.dataset.id;
        const name = decodeURIComponent(item.dataset.name);
        await importPlaylist(token, id, name, closeModal, onAddSong);
      });
    });

  } catch (err) {
    clearToken();
    body.innerHTML = `
      <div style="text-align:center; padding:24px; color:var(--accent-red);">
        <p style="font-weight:bold; margin-bottom:8px;">Spotify Error</p>
        <p style="font-size:0.85rem; word-break:break-word;">${err.message}</p>
        <button class="btn" id="btn-spotify-reconnect" style="margin-top:16px;">Start Over</button>
      </div>
    `;
    document.getElementById('btn-spotify-reconnect').addEventListener('click', () => {
      openSpotifyImportModal(onAddSong);
    });
  }
}

async function importPlaylist(token, playlistId, playlistName, closeModal, onAddSong) {
  const body = document.getElementById('spotify-modal-body');
  body.innerHTML = `
    <div style="text-align:center; padding:32px;">
      <div style="font-size:1rem; font-weight:bold; margin-bottom:12px;">
        Importing "<em>${playlistName}</em>"
      </div>
      <p style="font-size:0.85rem; color:#555;" id="import-progress">Fetching tracks from Spotify...</p>
      <div style="background:#ddd; border:var(--border-inset); border-color:var(--color-inset); height:16px; margin-top:16px; width:100%;">
        <div id="import-bar" style="background:#1DB954; height:100%; width:0%; transition:width 0.2s;"></div>
      </div>
    </div>
  `;

  try {
    const tracks = await getPlaylistTracks(token, playlistId, 30);
    let added = 0;
    let failed = 0;
    const total = tracks.length;

    for (let i = 0; i < total; i++) {
      const track = tracks[i];
      const progressEl = document.getElementById('import-progress');
      const barEl = document.getElementById('import-bar');
      if (progressEl) progressEl.textContent = `Matching ${i + 1} / ${total}: "${track.name}"`;
      if (barEl) barEl.style.width = `${Math.round(((i + 1) / total) * 100)}%`;

      const results = await searchSongs(`${track.name} ${track.artist}`);
      if (results.length > 0) {
        onAddSong(results[0]);
        added++;
      } else {
        failed++;
      }

      // Throttle to avoid YouTube API quota burn
      await new Promise(r => setTimeout(r, 250));
    }

    body.innerHTML = `
      <div style="text-align:center; padding:32px;">
        <div style="font-size:2.5rem; margin-bottom:8px;">✅</div>
        <p><strong>${added} song${added !== 1 ? 's' : ''}</strong> added to the queue!</p>
        ${failed > 0 ? `<p style="font-size:0.85rem; color:#888; margin-top:6px;">${failed} track${failed !== 1 ? 's' : ''} couldn't be matched on YouTube.</p>` : ''}
        <button class="btn btn-primary" id="btn-import-done" style="margin-top:20px;">
          Done
        </button>
      </div>
    `;
    document.getElementById('btn-import-done').addEventListener('click', closeModal);

  } catch (err) {
    body.innerHTML = `
      <div style="text-align:center; padding:24px; color:var(--accent-red);">
        Import failed: ${err.message}
      </div>
    `;
  }
}
