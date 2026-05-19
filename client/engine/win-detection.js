/**
 * Win Detection System
 * Handles game completion and victory conditions
 */

import { PIECES_PER_PLAYER, FINISH_POS } from './board-constants.js';

/**
 * Check if player has won
 * @param {Object} player - Player to check
 * @returns {boolean} True if all pieces finished
 */
export function hasPlayerWon(player) {
  return player.finishedPieces === PIECES_PER_PLAYER;
}

/**
 * Check if any player has won
 * @param {Array<Object>} players - All players
 * @returns {Object|null} Winner object or null
 */
export function getWinner(players) {
  for (const player of players) {
    if (hasPlayerWon(player)) {
      return player;
    }
  }
  return null;
}

/**
 * Check if game is over
 * @param {Array<Object>} players - All players
 * @returns {boolean} True if someone has won
 */
export function isGameOver(players) {
  return getWinner(players) !== null;
}

/**
 * Update finished pieces count for player
 * @param {Object} player - Player
 * @returns {number} Number of finished pieces
 */
export function updateFinishedPieces(player) {
  player.finishedPieces = player.pieces.filter(p => p.position === FINISH_POS).length;
  
  if (hasPlayerWon(player)) {
    player.hasWon = true;
    player.score = 100; // Base score for winning
  }

  return player.finishedPieces;
}

/**
 * Get game standings (ranking)
 * @param {Array<Object>} players - All players
 * @returns {Array<Object>} Players ranked by finished pieces
 */
export function getGameStandings(players) {
  return players
    .map(player => ({
      ...player,
      finishedPieces: player.finishedPieces,
      progress: calculatePlayerProgress(player),
      rank: 0
    }))
    .sort((a, b) => b.finishedPieces - a.finishedPieces)
    .map((player, index) => {
      player.rank = index + 1;
      return player;
    });
}

/**
 * Calculate player progress (0-100)
 * @param {Object} player - Player
 * @returns {number} Progress percentage
 */
export function calculatePlayerProgress(player) {
  if (!player.pieces || player.pieces.length === 0) return 0;

  let totalProgress = 0;

  player.pieces.forEach(piece => {
    if (piece.isFinished) {
      totalProgress += 100;
    } else if (piece.position === -1) {
      totalProgress += 0;
    } else if (piece.position >= 0 && piece.position <= 51) {
      totalProgress += (piece.position / 52) * 75;
    } else if (piece.position >= 52 && piece.position <= 56) {
      totalProgress += 75 + ((piece.position - 52) / 5) * 25;
    }
  });

  return Math.round(totalProgress / PIECES_PER_PLAYER);
}

/**
 * Get victory report
 * @param {Object} winner - Winning player
 * @param {Array<Object>} players - All players
 * @returns {Object} Victory information
 */
export function getVictoryReport(winner, players) {
  const standings = getGameStandings(players);
  const winTime = Date.now();

  return {
    winner: {
      id: winner.id,
      name: winner.name,
      color: winner.color
    },
    standings,
    totalTurns: players.reduce((sum, p) => sum + (p.consecutiveSixes || 0), 0),
    totalCaptures: players.reduce((sum, p) => {
      return sum + p.pieces.reduce((pieceSum, piece) => pieceSum + piece.capturedCount, 0);
    }, 0),
    winTime,
    message: `🏆 ${winner.name} (${winner.color}) has won the game!`
  };
}

/**
 * Calculate player score
 * @param {Object} player - Player
 * @param {number} position - Position in finishing order (1st, 2nd, etc)
 * @returns {number} Score points
 */
export function calculatePlayerScore(player, position) {
  let score = 0;

  // Base score for finished pieces
  score += player.finishedPieces * 10;

  // Position bonus
  const positionBonus = {
    1: 100,  // 1st place
    2: 50,   // 2nd place
    3: 25,   // 3rd place
    4: 10    // 4th place
  };
  score += positionBonus[position] || 0;

  // Capture bonus
  const captureCount = player.pieces.reduce((sum, p) => sum + (p.capturedCount > 0 ? 1 : 0), 0);
  score += captureCount * 2;

  return score;
}

/**
 * Reset win state for new game
 * @param {Array<Object>} players - All players
 */
export function resetWinState(players) {
  players.forEach(player => {
    player.hasWon = false;
    player.finishedPieces = 0;
    player.score = 0;
    player.pieces.forEach(piece => {
      piece.isFinished = false;
      piece.position = -1;
    });
  });
}

/**
 * Check for multiple players finishing on same turn
 * @param {number} diceRoll - Dice value rolled
 * @param {Array<Object>} players - All players
 * @returns {Array<Object>} Players who just finished
 */
export function checkSimultaneousFinish(diceRoll, players) {
  const finished = [];

  players.forEach(player => {
    player.pieces.forEach(piece => {
      if (piece.position + diceRoll === 57 && !piece.isFinished) {
        finished.push({ player, piece });
      }
    });
  });

  return finished;
}
