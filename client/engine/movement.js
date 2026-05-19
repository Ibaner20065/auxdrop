/**
 * Movement Engine
 * Handles piece movement, path validation, and home stretch logic
 */

import { BOARD_PATH, HOME_STRETCH, ENTRY_POINTS, MAX_BOARD_POS, MAX_HOME_STRETCH_POS, FINISH_POS } from './board-constants.js';

/**
 * Get grid position for a piece
 * @param {string} color - Player color
 * @param {number} position - Piece position (-1 to 57)
 * @param {number} pieceIndex - Piece index (0-3)
 * @returns {Array<number>|null} [row, col] or null
 */
export function getGridPosition(color, position, pieceIndex) {
  // Home (base) position
  if (position === -1) {
    const basePath = {
      red: [[2, 2], [2, 3], [3, 2], [3, 3]],
      green: [[2, 11], [2, 12], [3, 11], [3, 12]],
      yellow: [[11, 11], [11, 12], [12, 11], [12, 12]],
      blue: [[11, 2], [11, 3], [12, 2], [12, 3]]
    };
    return basePath[color][pieceIndex] || null;
  }

  // On board (main path)
  if (position >= 0 && position <= MAX_BOARD_POS) {
    // Adjust for player's starting position
    const startIndex = ENTRY_POINTS[color];
    const pathIndex = (position + startIndex) % BOARD_PATH.length;
    return BOARD_PATH[pathIndex];
  }

  // Home stretch (final approach)
  if (position >= 52 && position <= MAX_HOME_STRETCH_POS) {
    const homeStretchIndex = position - 52;
    return HOME_STRETCH[color][homeStretchIndex] || null;
  }

  // Finished (center)
  if (position === FINISH_POS) {
    return [7, 7]; // Center of board
  }

  return null;
}

/**
 * Move piece to new position
 * @param {Object} piece - Piece to move
 * @param {number} newPosition - New position value
 * @returns {Object} Movement result
 */
export function movePiece(piece, newPosition) {
  const oldPosition = piece.position;
  piece.position = newPosition;

  // Update piece state flags
  if (newPosition === -1) {
    piece.isHome = true;
  } else {
    piece.isHome = false;
  }

  if (newPosition === FINISH_POS) {
    piece.isFinished = true;
  }

  return {
    oldPosition,
    newPosition,
    isHome: piece.isHome,
    isFinished: piece.isFinished
  };
}

/**
 * Check if position is safe from capture
 * @param {number} position - Position to check
 * @param {string} color - Player color
 * @returns {boolean} True if safe
 */
export function isSafePosition(position, color) {
  // Home and finish are always safe
  if (position === -1 || position === FINISH_POS) return true;

  // Home stretch is always safe
  if (position >= 52 && position <= MAX_HOME_STRETCH_POS) return true;

  // Check safe squares (specific tiles on board)
  const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
  
  if (position >= 0 && position <= MAX_BOARD_POS) {
    // Map position to absolute board position
    const startIndex = ENTRY_POINTS[color];
    const absolutePos = (position + startIndex) % BOARD_PATH.length;
    return SAFE_SQUARES.has(absolutePos);
  }

  return false;
}

/**
 * Get pieces at a specific position
 * @param {Array<Object>} players - All players
 * @param {number} position - Position to check
 * @param {string} excludeColor - Color to exclude (optional)
 * @returns {Array<Object>} Pieces at position
 */
export function getPiecesAtPosition(players, position, excludeColor = null) {
  const pieces = [];

  players.forEach(player => {
    if (excludeColor && player.color === excludeColor) return;

    player.pieces.forEach(piece => {
      if (piece.position === position) {
        pieces.push({ piece, player });
      }
    });
  });

  return pieces;
}

/**
 * Check if piece can move to position (path/boundary validation)
 * @param {number} currentPos - Current position
 * @param {number} targetPos - Target position
 * @returns {Object} Validation result
 */
export function canMoveToPosition(currentPos, targetPos) {
  // Home to board
  if (currentPos === -1) {
    return {
      valid: targetPos === 0,
      reason: targetPos !== 0 ? 'Can only spawn at entry point' : ''
    };
  }

  // Board movement
  if (currentPos >= 0 && currentPos <= MAX_BOARD_POS) {
    if (targetPos > MAX_BOARD_POS && targetPos < 52) {
      return {
        valid: false,
        reason: 'Cannot overshoot into home stretch'
      };
    }
    return {
      valid: targetPos >= currentPos,
      reason: 'Can only move forward'
    };
  }

  // Home stretch movement
  if (currentPos >= 52 && currentPos <= MAX_HOME_STRETCH_POS) {
    if (targetPos > FINISH_POS) {
      return {
        valid: false,
        reason: 'Overshot the finish'
      };
    }
    return {
      valid: targetPos >= currentPos,
      reason: 'Can only move forward'
    };
  }

  return {
    valid: false,
    reason: 'Invalid current position'
  };
}

/**
 * Get path tiles between two positions (for animation)
 * @param {string} color - Player color
 * @param {number} fromPos - Start position
 * @param {number} toPos - End position
 * @returns {Array<Array<number>>} Array of [row, col] coordinates
 */
export function getPathTiles(color, fromPos, toPos) {
  const tiles = [];

  if (fromPos === -1 && toPos === 0) {
    // Spawning from home
    tiles.push(getGridPosition(color, -1, 0));
    tiles.push(getGridPosition(color, 0, 0));
  } else if (fromPos >= 0 && toPos > fromPos) {
    // Moving on board
    for (let pos = fromPos; pos <= toPos; pos++) {
      tiles.push(getGridPosition(color, pos, 0));
    }
  }

  return tiles.filter(t => t !== null);
}

/**
 * Calculate progress towards finish
 * @param {number} position - Current position
 * @returns {number} Percentage (0-100)
 */
export function calculateProgress(position) {
  if (position === -1) return 0;
  if (position === FINISH_POS) return 100;
  if (position >= 0 && position <= MAX_BOARD_POS) {
    return Math.round((position / MAX_BOARD_POS) * 50);
  }
  if (position >= 52 && position <= MAX_HOME_STRETCH_POS) {
    return 50 + Math.round(((position - 52) / (MAX_HOME_STRETCH_POS - 52)) * 50);
  }
  return 0;
}
