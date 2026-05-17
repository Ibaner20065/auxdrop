const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
const REDIRECT_URI = window.location.origin;
const SCOPES = 'playlist-read-private playlist-read-collaborative';

// ─── PKCE Helpers ────────────────────────────────────────────────
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  return Array.from(values).map(v => chars[v % chars.length]).join('');
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// ─── Public API ──────────────────────────────────────────────────
export function isConfigured() {
  return !!CLIENT_ID;
}

export function getToken() {
  return sessionStorage.getItem('spotify_token');
}

export function clearToken() {
  sessionStorage.removeItem('spotify_token');
  sessionStorage.removeItem('spotify_code_verifier');
}

export async function openAuthPopup() {
  // Generate PKCE pair
  const codeVerifier = generateRandomString(128);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  sessionStorage.setItem('spotify_code_verifier', codeVerifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    show_dialog: 'false',
  });

  const popup = window.open(
    `https://accounts.spotify.com/authorize?${params}`,
    'spotify-auth',
    'width=450,height=650,left=200,top=100'
  );

  return new Promise((resolve, reject) => {
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
      }
    }, 600);

    const timeout = setTimeout(() => {
      clearInterval(checkClosed);
      popup?.close();
      reject(new Error('Spotify login timed out'));
    }, 120000);

    // The popup will postMessage the auth CODE back here
    window.addEventListener('message', async (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'SPOTIFY_CODE') {
        clearInterval(checkClosed);
        clearTimeout(timeout);
        popup?.close();
        try {
          const token = await exchangeCodeForToken(event.data.code, codeVerifier);
          sessionStorage.setItem('spotify_token', token);
          resolve(token);
        } catch (err) {
          reject(err);
        }
      }
    }, { once: true });
  });
}

async function exchangeCodeForToken(code, codeVerifier) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Token exchange failed: ' + (data.error_description || data.error));
  return data.access_token;
}

// ─── Spotify API Calls ───────────────────────────────────────────
export async function getMyPlaylists(token) {
  const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 401) clearToken();
    let errMsg = 'Failed to fetch playlists';
    try {
      const errData = await res.json();
      errMsg = errData.error?.message || errData.error_description || errMsg;
    } catch (e) {}
    throw new Error(`(${res.status}) ${errMsg}`);
  }
  const data = await res.json();
  return data.items || [];
}

export async function getPlaylistTracks(token, playlistId, limit = 30) {
  const tracks = [];
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`;

  while (url && tracks.length < limit) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) break;
    const data = await res.json();
    for (const item of data.items || []) {
      if (item.track?.type === 'track' && !item.is_local) {
        tracks.push({
          name: item.track.name,
          artist: item.track.artists.map(a => a.name).join(', '),
          thumbnail: item.track.album.images[0]?.url || '',
        });
        if (tracks.length >= limit) break;
      }
    }
    url = data.next;
  }

  return tracks;
}
