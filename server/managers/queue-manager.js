const queues = new Map();

function sanitizeQueue(queue, hideVotes = true) {
  return queue.map(song => ({
    id: song.id,
    videoId: song.videoId,
    title: song.title,
    artist: song.artist,
    thumbnail: song.thumbnail,
    duration: song.duration,
    addedBy: song.addedBy,
    addedAt: song.addedAt,
    status: song.status,
    score: song.score,
    voteCount: song.votes.size,
  }));
}

export function addSong(sessionCode, song, userId) {
  if (!queues.has(sessionCode)) {
    queues.set(sessionCode, []);
  }

  const queue = queues.get(sessionCode);
  const exists = queue.some(s => s.videoId === song.videoId && s.status !== 'played');
  if (exists) return { error: 'Song already in queue' };

  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    videoId: song.videoId,
    title: song.title,
    artist: song.artist,
    thumbnail: song.thumbnail,
    duration: song.duration || 0,
    addedBy: userId,
    score: 0,
    votes: new Map(),
    addedAt: Date.now(),
    status: 'queued',
  };

  queue.push(entry);
  return { song: entry, queue: sanitizeQueue(getSortedQueue(sessionCode)) };
}

export function removeSong(sessionCode, songId) {
  const queue = queues.get(sessionCode);
  if (!queue) return null;

  const idx = queue.findIndex(s => s.id === songId);
  if (idx === -1) return null;

  const removed = queue.splice(idx, 1)[0];
  return { removed, queue: sanitizeQueue(getSortedQueue(sessionCode)) };
}

export function getQueue(sessionCode) {
  return queues.get(sessionCode) || [];
}

export function getPublicQueue(sessionCode) {
  return sanitizeQueue(getQueue(sessionCode));
}

export function getSortedQueue(sessionCode) {
  const queue = queues.get(sessionCode) || [];
  return [...queue]
    .filter(s => s.status === 'queued')
    .sort((a, b) => b.score - a.score || a.addedAt - b.addedAt);
}

export function getPublicSortedQueue(sessionCode) {
  return sanitizeQueue(getSortedQueue(sessionCode));
}

export function nextSong(sessionCode) {
  const sorted = getSortedQueue(sessionCode);
  if (sorted.length === 0) return null;

  const next = sorted[0];
  next.status = 'playing';

  const queue = queues.get(sessionCode);
  const idx = queue.findIndex(s => s.id === next.id);
  if (idx !== -1) {
    queue[idx].status = 'playing';
  }

  return next;
}

export function markPlayed(sessionCode, songId) {
  const queue = queues.get(sessionCode);
  if (!queue) return null;
  const song = queue.find(s => s.id === songId);
  if (song) song.status = 'played';
  return song;
}

export function updateScore(sessionCode, songId, delta) {
  const queue = queues.get(sessionCode);
  if (!queue) return null;
  const song = queue.find(s => s.id === songId);
  if (!song) return null;
  song.score += delta;
  return { score: song.score, queue: sanitizeQueue(getSortedQueue(sessionCode)) };
}

export function clearQueue(sessionCode) {
  queues.delete(sessionCode);
}

export function getInternalQueue(sessionCode) {
  return queues.get(sessionCode) || [];
}

export function moveSong(sessionCode, songId, direction) {
  const queue = queues.get(sessionCode);
  if (!queue) return null;
  
  const sorted = getSortedQueue(sessionCode);
  const idx = sorted.findIndex(s => s.id === songId);
  if (idx === -1) return null;
  
  if (direction === 'up' && idx > 0) {
    const target = sorted[idx];
    const swapWith = sorted[idx - 1];
    
    const tempScore = target.score;
    target.score = swapWith.score;
    swapWith.score = tempScore;
    
    const tempAdded = target.addedAt;
    target.addedAt = swapWith.addedAt - 1;
    swapWith.addedAt = tempAdded;
  } else if (direction === 'down' && idx < sorted.length - 1) {
    const target = sorted[idx];
    const swapWith = sorted[idx + 1];
    
    const tempScore = target.score;
    target.score = swapWith.score;
    swapWith.score = tempScore;
    
    const tempAdded = target.addedAt;
    target.addedAt = swapWith.addedAt + 1;
    swapWith.addedAt = tempAdded;
  }
  
  return { queue: sanitizeQueue(getSortedQueue(sessionCode)) };
}
