/**
 * Players and Pieces Data Structures
 * Defines player and piece models
 */

import { COLORS, PIECES_PER_PLAYER, BASE_POSITIONS } from './board-constants.js';

/**
 * Create a piece object
 * @param {string} color - Piece color
 * @param {number} index - Piece index (0-3)
 * @returns {Object} Piece object
 */
export function createPiece(color, index) {
  return {
    id: `${color}_${index}`,
    color,
    index,
    position: -1,          // -1 = home, 0-51 = board, 52-56 = home stretch, 57 = finished
    isHome: true,
    isFinished: false,
    capturedCount: 0       // How many times this piece was captured
  };
}

/**
 * Create a player object
 * @param {string} color - Player color
 * @param {string} name - Player name
 * @param {string} userId - Unique user ID
 * @param {boolean} isAI - Is AI player
 * @returns {Object} Player object
 */
export function createPlayer(color, name, userId, isAI = false) {
  const colorIndex = COLORS.indexOf(color);
  if (colorIndex === -1) throw new Error(`Invalid color: ${color}`);

  return {
    id: userId,
    name,
    color,
    isAI,
    pieces: Array.from({ length: PIECES_PER_PLAYER }, (_, i) => createPiece(color, i)),
    score: 0,
    finishedPieces: 0,    // Number of pieces that reached finish
    consecutiveSixes: 0,  // Track 6s rolled
    hasWon: false,
    joinedAt: Date.now()
  };
}

/**
 * Initialize players for a game
 * @param {Array<Object>} playerConfigs - Array of {name, userId, isAI?, color?}
 * @returns {Array<Object>} Array of player objects
 */
export function initializePlayers(playerConfigs) {
  const players = [];
  const usedColors = new Set();

  playerConfigs.forEach((config, index) => {
    // Auto-assign color if not provided
    let color = config.color;
    if (!color) {
      color = COLORS[index % COLORS.length];
    }

    if (usedColors.has(color)) {
      throw new Error(`Color ${color} already assigned`);
    }

    usedColors.add(color);

    const player = createPlayer(
      color,
      config.name || `Player ${index + 1}`,
      config.userId || `player_${index}`,
      config.isAI || false
    );

    players.push(player);
  });

  return players;
}

/**
 * Get player by ID
 * @param {Array<Object>} players - Array of players
 * @param {string} userId - User ID to find
 * @returns {Object|null} Player object or null
 */
export function getPlayerById(players, userId) {
  return players.find(p => p.id === userId) || null;
}

/**
 * Get player by color
 * @param {Array<Object>} players - Array of players
 * @param {string} color - Color to find
 * @returns {Object|null} Player object or null
 */
export function getPlayerByColor(players, color) {
  return players.find(p => p.color === color) || null;
}

/**
 * Check if player has won
 * @param {Object} player - Player object
 * @returns {boolean} True if all pieces are finished
 */
export function hasPlayerWon(player) {
  return player.finishedPieces === PIECES_PER_PLAYER;
}

/**
 * Get movable pieces for a player
 * @param {Object} player - Player object
 * @param {number} diceValue - Dice roll value
 * @returns {Array<number>} Array of piece indices that can move
 */
export function getMovablePieces(player, diceValue) {
  return player.pieces
    .map((piece, index) => ({ piece, index }))
    .filter(({ piece }) => {
      // Finished pieces can't move
      if (piece.isFinished) return false;
      
      // Home pieces can only move with 6
      if (piece.position === -1) return diceValue === 6;
      
      // Pieces on board can always move (if move is valid)
      return true;
    })
    .map(({ index }) => index);
}

/**
 * Reset player for new game
 * @param {Object} player - Player to reset
 */
export function resetPlayer(player) {
  player.pieces.forEach((piece, index) => {
    piece.position = -1;
    piece.isHome = true;
    piece.isFinished = false;
    piece.capturedCount = 0;
  });
  player.score = 0;
  player.finishedPieces = 0;
  player.consecutiveSixes = 0;
  player.hasWon = false;
}
