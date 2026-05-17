let API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || '';
const BASE_URL = 'https://www.googleapis.com/youtube/v3/search';

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 300;

export async function searchSongs(query) {
  if (!query || query.trim().length < 2) return [];

  const normalized = query.trim().toLowerCase();

  const cached = cache.get(normalized);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.results;
  }

  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(r => setTimeout(r, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }

  try {
    lastRequestTime = Date.now();

    const params = new URLSearchParams({
      part: 'snippet',
      q: `${query} music`,
      type: 'video',
      videoCategoryId: '10',
      videoEmbeddable: 'true',
      videoSyndicated: 'true',
      maxResults: 12,
      key: API_KEY,
    });

    const response = await fetch(`${BASE_URL}?${params}`);
    if (!response.ok) throw new Error(`YouTube API error: ${response.status}`);

    const data = await response.json();

    const results = (data.items || []).map(item => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      duration: 0,
    }));

    cache.set(normalized, { results, timestamp: Date.now() });

    return results;
  } catch (err) {
    console.error('YouTube search error:', err);
    return [];
  }
}

export function setApiKey(key) {
  API_KEY = key;
}

export function clearCache() {
  cache.clear();
}
