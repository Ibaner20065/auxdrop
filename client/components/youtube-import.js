import { getYouTubePlaylistItems } from '../services/youtube-search.js';

export function openYouTubeImportModal(onAddSong) {
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

  modal.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">▶️ Import YouTube Playlist</h2>
      <button class="modal-close" id="yt-modal-close">✕</button>
    </div>
    <div class="modal-body" style="padding:24px;">
      <p style="margin-bottom:12px; font-size:0.9rem;">
        Paste a YouTube or YouTube Music playlist link below. The playlist must be public or unlisted.
      </p>
      <input type="text" id="yt-playlist-url" class="search-input" placeholder="https://youtube.com/playlist?list=..." style="margin-bottom:16px;">
      
      <div id="yt-import-status" style="font-size:0.85rem; margin-bottom:16px; color:var(--accent-red); display:none; word-break: break-word;"></div>
      
      <button class="btn btn-primary" id="btn-yt-import" style="width:100%; background:#FF0000; border-color:#FF0000; color:#FFF; font-weight:bold;">
        Import Playlist
      </button>
    </div>
  `;

  document.getElementById('yt-modal-close').addEventListener('click', closeModal);
  const inputEl = document.getElementById('yt-playlist-url');
  const btnEl = document.getElementById('btn-yt-import');
  const statusEl = document.getElementById('yt-import-status');

  btnEl.addEventListener('click', async () => {
    const urlStr = inputEl.value.trim();
    if (!urlStr) return;

    // Extract list= parameter
    let playlistId = null;
    try {
      const parsedUrl = new URL(urlStr);
      playlistId = parsedUrl.searchParams.get('list');
    } catch {
      // Maybe they just pasted the ID directly
      playlistId = urlStr.length >= 15 ? urlStr : null;
    }

    if (!playlistId) {
      statusEl.textContent = 'Could not find a valid playlist ID (list=...) in that link.';
      statusEl.style.display = 'block';
      return;
    }

    statusEl.style.display = 'block';
    statusEl.style.color = '#fff';
    statusEl.textContent = 'Fetching playlist...';
    btnEl.disabled = true;

    try {
      const tracks = await getYouTubePlaylistItems(playlistId, 50); // Get up to 50 tracks
      
      if (tracks.length === 0) {
        throw new Error('No valid tracks found. The playlist might be empty, private, or a dynamic "Mix" (which YouTube blocks).');
      }

      statusEl.textContent = `Found ${tracks.length} tracks. Adding to queue...`;
      
      let addedCount = 0;
      for (const track of tracks) {
        const result = await onAddSong(track);
        if (result && result.error) {
          throw new Error(result.error); // Stop on first backend error
        }
        addedCount++;
        // Small delay to prevent socket flooding
        await new Promise(r => setTimeout(r, 100));
      }

      modal.innerHTML = `
        <div class="modal-header">
          <h2 class="modal-title">▶️ Import YouTube Playlist</h2>
          <button class="modal-close" id="yt-modal-close-done">✕</button>
        </div>
        <div class="modal-body" style="text-align:center; padding:32px;">
          <div style="font-size:2.5rem; margin-bottom:8px;">✅</div>
          <p><strong>${addedCount} songs</strong> added to the queue!</p>
          <button class="btn btn-primary" id="btn-yt-done" style="margin-top:20px;">
            Done
          </button>
        </div>
      `;
      document.getElementById('yt-modal-close-done').addEventListener('click', closeModal);
      document.getElementById('btn-yt-done').addEventListener('click', closeModal);

    } catch (err) {
      statusEl.style.color = 'var(--accent-red)';
      statusEl.textContent = `Error: ${err.message}`;
      btnEl.disabled = false;
    }
  });
}
