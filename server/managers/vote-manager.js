import { getSession } from './session-manager.js';
import { getInternalQueue, removeSong, getPublicSortedQueue } from './queue-manager.js';

const AUTO_SKIP_THRESHOLD = -3;

export function vote(sessionCode, songId, userId, direction) {
  const session = getSession(sessionCode);
  if (!session) return { error: 'Session not found' };

  const queue = getInternalQueue(sessionCode);
  const song = queue.find(s => s.id === songId);
  if (!song) return { error: 'Song not found' };
  if (song.status === 'playing') return { error: 'Cannot vote on currently playing song' };

  const currentVote = song.votes.get(userId);

  // Toggle vote or change direction
  if (currentVote === direction) {
    song.votes.delete(userId);
    song.score -= direction;
  } else {
    if (currentVote) {
      song.score -= currentVote;
    }
    song.votes.set(userId, direction);
    song.score += direction;
  }

  const shouldSkip = song.score <= AUTO_SKIP_THRESHOLD;
  if (shouldSkip) {
    removeSong(sessionCode, songId);
  }

  return {
    score: song.score,
    songId,
    shouldSkip,
    queue: getPublicSortedQueue(sessionCode),
  };
}

export function isAutoSkippable(sessionCode, song) {
  const session = getSession(sessionCode);
  if (!session) return false;
  const threshold = session.users.size <= 5 ? -2 : session.users.size <= 15 ? -3 : -4;
  return song.score <= threshold;
}
