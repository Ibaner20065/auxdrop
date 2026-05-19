/**
 * Board Path and Constants
 * Defines the master board path and all game constants
 */

// Master board path - 52 tiles total (clockwise)
export const BOARD_PATH = [
  // Red starting path (0-5)
  [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  // Green starting path (5-12)
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6],
  [0, 6], [0, 7], [0, 8],
  // Yellow starting path (12-20)
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14],
  // Blue starting path (20-51)
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8],
  [14, 8], [14, 7], [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0]
];

// Home stretch for each player (final 5 tiles)
export const HOME_STRETCH = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]
};

// Base positions (home) for each player
export const BASE_POSITIONS = {
  red: [[2, 2], [2, 3], [3, 2], [3, 3]],
  green: [[2, 11], [2, 12], [3, 11], [3, 12]],
  yellow: [[11, 11], [11, 12], [12, 11], [12, 12]],
  blue: [[11, 2], [11, 3], [12, 2], [12, 3]]
};

// Entry points on main path (where pieces spawn when rolling 6)
export const ENTRY_POINTS = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39
};

// Safe squares (cannot be captured)
export const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// Player colors (in order)
export const COLORS = ['red', 'green', 'yellow', 'blue'];

// Piece positions constants
export const PIECE_STATES = {
  HOME: -1,           // In base (not on board)
  BOARD: 0,          // On main path (0-51)
  HOME_STRETCH: 52,  // In home stretch (52-56)
  FINISHED: 57       // In center (won)
};

// Maximum pieces per player
export const PIECES_PER_PLAYER = 4;

// Maximum position on board
export const MAX_BOARD_POS = 51;
export const MAX_HOME_STRETCH_POS = 56;
export const FINISH_POS = 57;
