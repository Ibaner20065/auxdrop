export function generateStats(session, queue, startTime, endTime) {
  const allSongs = queue;

  const songsPlayed = allSongs.filter(s => s.status === 'played');
  const songsSkipped = allSongs.filter(s => s.status === 'skipped');

  const contributorCounts = new Map();
  for (const song of allSongs) {
    contributorCounts.set(song.addedBy, (contributorCounts.get(song.addedBy) || 0) + 1);
  }

  const skipCounts = new Map();
  for (const song of songsSkipped) {
    skipCounts.set(song.addedBy, (skipCounts.get(song.addedBy) || 0) + 1);
  }

  let topContributor = null;
  let maxAdded = 0;
  for (const [userId, count] of contributorCounts) {
    if (count > maxAdded) {
      maxAdded = count;
      topContributor = { userId, count };
    }
  }

  let vibeKiller = null;
  let maxSkipped = 0;
  for (const [userId, count] of skipCounts) {
    if (count > maxSkipped) {
      maxSkipped = count;
      vibeKiller = { userId, count };
    }
  }

  const playedByUser = new Map();
  for (const song of songsPlayed) {
    playedByUser.set(song.addedBy, (playedByUser.get(song.addedBy) || 0) + 1);
  }

  let djCrown = null;
  let maxPlayed = 0;
  for (const [userId, count] of playedByUser) {
    if (count > maxPlayed) {
      maxPlayed = count;
      djCrown = { userId, count };
    }
  }

  let mostControversial = null;
  let maxVotes = 0;
  for (const song of allSongs) {
    const totalVotes = song.votes?.size || 0;
    if (totalVotes > maxVotes) {
      maxVotes = totalVotes;
      mostControversial = { song, totalVotes };
    }
  }

  const totalVotesCast = allSongs.reduce((sum, s) => sum + (s.votes?.size || 0), 0);

  return {
    totalSongsPlayed: songsPlayed.length,
    totalSongsAdded: allSongs.length,
    totalVotesCast,
    sessionDuration: endTime - startTime,
    djCrown: djCrown
      ? { userId: djCrown.userId, name: getUsername(session, djCrown.userId), count: djCrown.count }
      : null,
    vibeKiller: vibeKiller
      ? { userId: vibeKiller.userId, name: getUsername(session, vibeKiller.userId), count: vibeKiller.count }
      : null,
    topContributor: topContributor
      ? { userId: topContributor.userId, name: getUsername(session, topContributor.userId), count: topContributor.count }
      : null,
    mostControversial: mostControversial
      ? { title: mostControversial.song.title, totalVotes: mostControversial.totalVotes }
      : null,
    topContributorCount: maxAdded,
  };
}

function getUsername(session, userId) {
  const user = session.users.get(userId);
  return user ? user.name : 'Unknown';
}
