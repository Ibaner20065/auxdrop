const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
const REDIRECT_URI = window.location.origin;
const SCOPES = 'playlist-read-private playlist-read-collaborative';

export function isConfigured() {
  return !!CLIENT_ID;
}

export function getToken() {
  return sessionStorage.getItem('spotify_token');
}

export function clearToken() {
  sessionStorage.removeItem('spotify_token');
}

export function openAuthPopup() {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'token',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      show_dialog: 'false',
    });

    const popup = window.open(
      `https://accounts.spotify.com/authorize?${params}`,
      'spotify-auth',
      'width=450,height=650,left=200,top=100'
    );

    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        // Don't reject — the message may have already come through
      }
    }, 600);

    const timeout = setTimeout(() => {
      clearInterval(checkClosed);
      popup?.close();
      reject(new Error('Spotify login timed out'));
    }, 120000);

    window.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'SPOTIFY_TOKEN') {
        clearInterval(checkClosed);
        clearTimeout(timeout);
        sessionStorage.setItem('spotify_token', event.data.token);
        popup?.close();
        resolve(event.data.token);
      }
    }, { once: true });
  });
}

export async function getMyPlaylists(token) {
  const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 401) clearToken();
    throw new Error('Failed to fetch playlists');
  }
  const data = await res.json();
  return data.items || [];
}

export async function getPlaylistTracks(token, playlistId, limit = 30) {
  const tracks = [];
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`;

  while (url && tracks.length < limit) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
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
