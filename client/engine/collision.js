/**
 * Collision System
 * Handles piece captures, safe zones, and spawn logic
 */

import { isSafePosition, getPiecesAtPosition } from './movement.js';
import { PIECES_PER_PLAYER } from './board-constants.js';

/**
 * Check for captures after moving
 * @param {Object} movingPiece - The piece that just moved
 * @param {string} playerColor - Color of moving player
 * @param {number} newPosition - New position of piece
 * @param {Array<Object>} players - All players
 * @returns {Array<Object>} Captured pieces
 */
export function checkCaptures(movingPiece, playerColor, newPosition, players) {
  // Can't capture in safe positions
  if (isSafePosition(newPosition, playerColor)) {
    return [];
  }

  // Can't capture if piece is at home or finished
  if (newPosition === -1 || newPosition === 57) {
    return [];
  }

  const captured = [];
  const piecesAtLocation = getPiecesAtPosition(players, newPosition, playerColor);

  // Capture all opponent pieces at this location
  piecesAtLocation.forEach(({ piece, player }) => {
    // Send piece back home
    piece.position = -1;
    piece.isHome = true;
    piece.isFinished = false;
    piece.capturedCount++;

    captured.push({
      piece,
      player,
      capturedPieceId: piece.id
    });
  });

  return captured;
}

/**
 * Spawn a new piece from home
 * @param {Object} player - Player
 * @param {number} diceValue - Dice value (must be 6)
 * @returns {Object} Spawn result
 */
export function spawnNewPiece(player, diceValue) {
  if (diceValue !== 6) {
    return {
      success: false,
      reason: 'Need 6 to spawn piece'
    };
  }

  // Find a home piece
  const homePiece = player.pieces.find(p => p.position === -1);

  if (!homePiece) {
    return {
      success: false,
      reason: 'No pieces at home to spawn'
    };
  }

  // Move to entry point
  homePiece.position = 0;
  homePiece.isHome = false;

  return {
    success: true,
    piece: homePiece,
    message: 'New piece spawned!'
  };
}

/**
 * Check if a spawn position is blocked
 * @param {string} playerColor - Player color
 * @param {Array<Object>} players - All players
 * @returns {Object} Spawn check result
 */
export function isSpawnBlocked(playerColor, players) {
  const piecesAtEntry = getPiecesAtPosition(players, 0, playerColor);
  
  // Entry point is blocked if occupied by enemy pieces
  const enemyPieces = piecesAtEntry.filter(({ player }) => player.color !== playerColor);

  return {
    blocked: enemyPieces.length > 0,
    blockingPieces: enemyPieces.length,
    message: enemyPieces.length > 0 
      ? `Entry point blocked by ${enemyPieces.length} enemy piece(s)`
      : ''
  };
}

/**
 * Get safe adjacent positions from a location
 * @param {number} position - Current position
 * @param {string} color - Player color
 * @param {number} radius - Search radius (default 2)
 * @returns {Array<number>} Safe positions nearby
 */
export function getSafeNearbyPositions(position, color, radius = 2) {
  const safe = [];

  for (let offset = 1; offset <= radius; offset++) {
    const checkPos = position + offset;
    if (isSafePosition(checkPos, color)) {
      safe.push(checkPos);
    }
  }

  return safe;
}

/**
 * Calculate capture chain effects
 * @param {Array<Object>} players - All players
 * @returns {Object} Capture statistics
 */
export function calculateCaptureStats(players) {
  const stats = {};

  players.forEach(player => {
    let totalCaptures = 0;
    let totalCaptured = 0;

    player.pieces.forEach(piece => {
      totalCaptured += piece.capturedCount;
    });

    players.forEach(otherPlayer => {
      if (otherPlayer.color === player.color) return;

      otherPlayer.pieces.forEach(piece => {
        if (piece.capturedCount > 0) {
          // This piece was captured by player
          // (This is a simplified approach - in real game would track who captured whom)
        }
      });
    });

    stats[player.color] = {
      name: player.name,
      totalCaptured,
      survivingPieces: player.pieces.filter(p => p.position === -1 || p.position >= 0).length
    };
  });

  return stats;
}

/**
 * Check for double capture scenario
 * @param {Object} player - Player
 * @param {number} position - Position to check
 * @param {Array<Object>} players - All players
 * @returns {Array<Object>} Pieces that would be captured
 */
export function findDoubleCaptureOpportunity(player, position, players) {
  const piecesAtPosition = getPiecesAtPosition(players, position, player.color);
  
  // Return only opponent pieces (could be multiple)
  return piecesAtPosition.filter(({ piece, p }) => p.color !== player.color);
}

/**
 * Reset collision state for new game
 * @param {Array<Object>} players - All players
 */
export function resetCollisionState(players) {
  players.forEach(player => {
    player.pieces.forEach(piece => {
      piece.capturedCount = 0;
    });
  });
}
