/**
 * Dice Logic
 * Handles dice rolling and related game logic
 */

/**
 * Roll the dice
 * @returns {number} Random number 1-6
 */
export function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

/**
 * Process dice roll and determine next action
 * @param {Object} gameState - Current game state
 * @param {number} diceValue - The dice value rolled
 * @returns {Object} Result of dice roll
 */
export function processDiceRoll(gameState, diceValue) {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  
  // Track consecutive 6s
  if (diceValue === 6) {
    currentPlayer.consecutiveSixes++;
  } else {
    currentPlayer.consecutiveSixes = 0;
  }

  // Three 6s in a row = lose turn
  if (currentPlayer.consecutiveSixes >= 3) {
    return {
      success: true,
      value: diceValue,
      threeSixes: true,
      extraTurn: false,
      movablePieces: [],
      message: 'Three 6s in a row! Turn lost.'
    };
  }

  // Get movable pieces
  const { getMovablePieces } = require('./players.js');
  const movablePieces = getMovablePieces(currentPlayer, diceValue);

  return {
    success: true,
    value: diceValue,
    threeSixes: false,
    extraTurn: diceValue === 6,  // Extra turn on 6
    movablePieces,
    canSpawnNew: diceValue === 6,
    message: movablePieces.length === 0 
      ? `Rolled ${diceValue} but no valid moves available`
      : `Rolled ${diceValue}${diceValue === 6 ? ' - Extra turn!' : ''}`
  };
}

/**
 * Can player move a specific piece with dice value
 * @param {Object} piece - Piece to check
 * @param {number} diceValue - Dice value
 * @returns {boolean} True if piece can move
 */
export function canMovePiece(piece, diceValue) {
  // Home piece needs 6 to move
  if (piece.position === -1) {
    return diceValue === 6;
  }

  // Finished piece can't move
  if (piece.isFinished) {
    return false;
  }

  // Other pieces can move
  return true;
}

/**
 * Calculate new position after moving
 * @param {number} currentPos - Current position
 * @param {number} diceValue - Dice value
 * @returns {number|null} New position or null if invalid
 */
export function calculateNewPosition(currentPos, diceValue) {
  // From home
  if (currentPos === -1) {
    return diceValue === 6 ? 0 : -1;
  }

  // On board
  if (currentPos >= 0 && currentPos <= 51) {
    const newPos = currentPos + diceValue;
    
    // Move to home stretch
    if (newPos > 51) {
      const homeStretchPos = newPos - 52;
      if (homeStretchPos <= 5) {
        return 52 + homeStretchPos - 1;
      }
    }
    
    // Stay on board
    if (newPos <= 51) {
      return newPos;
    }
  }

  // In home stretch
  if (currentPos >= 52 && currentPos <= 56) {
    const newPos = currentPos + diceValue;
    
    // Reach finish
    if (newPos === 57) {
      return 57;
    }
    
    // Stay in home stretch
    if (newPos < 57) {
      return newPos;
    }
  }

  return null;
}

/**
 * Validate move
 * @param {Object} piece - Piece to move
 * @param {number} diceValue - Dice value
 * @returns {Object} Validation result
 */
export function validateMove(piece, diceValue) {
  if (!canMovePiece(piece, diceValue)) {
    return {
      valid: false,
      reason: piece.position === -1 
        ? 'Need 6 to move from home'
        : 'Piece cannot move'
    };
  }

  const newPos = calculateNewPosition(piece.position, diceValue);
  
  if (newPos === null) {
    return {
      valid: false,
      reason: 'Invalid move destination'
    };
  }

  return {
    valid: true,
    newPosition: newPos
  };
}
