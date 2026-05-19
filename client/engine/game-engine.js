/**
 * Game Engine - Main State Machine
 * Orchestrates all game logic, turn management, and state updates
 */

import { initializePlayers, hasPlayerWon, resetPlayer } from './players.js';
import { initializeTurnManager, getCurrentPlayer, advanceTurn } from './turn-manager.js';
import { rollDice, processDiceRoll, validateMove, calculateNewPosition } from './dice.js';
import { movePiece, isSafePosition, getGridPosition } from './movement.js';
import { checkCaptures, spawnNewPiece } from './collision.js';
import { hasPlayerWon as checkWin, getWinner, isGameOver, updateFinishedPieces } from './win-detection.js';
import { COLORS } from './board-constants.js';

/**
 * Create a new game state
 * @param {Array<Object>} playerConfigs - Player configurations
 * @returns {Object} Initial game state
 */
export function createGameState(playerConfigs) {
  const players = initializePlayers(playerConfigs);
  const turnManager = initializeTurnManager(players);

  return {
    id: generateGameId(),
    players,
    turnManager,
    currentPlayerIndex: 0,
    status: 'playing', // waiting, playing, finished, paused
    diceValue: null,
    lastRoll: null,
    movablePieces: [],
    selectedPiece: null,
    turnPhase: 'roll', // roll, select_piece, wait_next
    capturedThisTurn: [],
    history: [],
    winner: null,
    createdAt: Date.now(),
    startedAt: null,
    finishedAt: null
  };
}

/**
 * Generate unique game ID
 */
function generateGameId() {
  return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Start the game
 * @param {Object} gameState - Game state
 */
export function startGame(gameState) {
  gameState.status = 'playing';
  gameState.startedAt = Date.now();
  gameState.turnPhase = 'roll';
}

/**
 * Roll dice and process result
 * @param {Object} gameState - Game state
 * @returns {Object} Roll result
 */
export function rollDicePhase(gameState) {
  if (gameState.turnPhase !== 'roll') {
    return { success: false, error: 'Not in roll phase' };
  }

  const diceValue = rollDice();
  const result = processDiceRoll(gameState, diceValue);

  gameState.diceValue = diceValue;
  gameState.lastRoll = {
    value: diceValue,
    timestamp: Date.now(),
    playerColor: getCurrentPlayer(gameState.turnManager).color
  };

  // Check for three 6s
  if (result.threeSixes) {
    gameState.turnPhase = 'end_turn';
    getCurrentPlayer(gameState.turnManager).consecutiveSixes = 0;
    return result;
  }

  // Check for no valid moves
  if (result.movablePieces.length === 0) {
    gameState.turnPhase = 'end_turn';
    gameState.diceValue = null;
    return result;
  }

  gameState.movablePieces = result.movablePieces;
  gameState.turnPhase = 'select_piece';

  return result;
}

/**
 * Move a piece
 * @param {Object} gameState - Game state
 * @param {number} pieceIndex - Index of piece to move
 * @returns {Object} Move result
 */
export function movePiecePhase(gameState, pieceIndex) {
  if (gameState.turnPhase !== 'select_piece') {
    return { success: false, error: 'Not in select piece phase' };
  }

  const currentPlayer = getCurrentPlayer(gameState.turnManager);
  const piece = currentPlayer.pieces[pieceIndex];

  if (!piece) {
    return { success: false, error: 'Invalid piece' };
  }

  // Validate move
  const validation = validateMove(piece, gameState.diceValue);
  if (!validation.valid) {
    return { success: false, error: validation.reason };
  }

  // Move the piece
  const oldPos = piece.position;
  const newPos = validation.newPosition;

  movePiece(piece, newPos);

  // Check for captures
  gameState.capturedThisTurn = checkCaptures(piece, currentPlayer.color, newPos, gameState.players);

  // Update finished pieces
  if (newPos === 57) {
    updateFinishedPieces(currentPlayer);
  }

  // Prepare move record
  const moveRecord = {
    playerId: currentPlayer.id,
    playerColor: currentPlayer.color,
    pieceIndex,
    fromPosition: oldPos,
    toPosition: newPos,
    diceValue: gameState.diceValue,
    capturedPieces: gameState.capturedThisTurn.map(c => c.capturedPieceId),
    timestamp: Date.now()
  };

  gameState.history.push(moveRecord);
  gameState.turnPhase = 'wait_next';

  return {
    success: true,
    move: moveRecord,
    captured: gameState.capturedThisTurn,
    gameOver: isGameOver(gameState.players)
  };
}

/**
 * Spawn a new piece
 * @param {Object} gameState - Game state
 * @returns {Object} Spawn result
 */
export function spawnPiecePhase(gameState) {
  if (gameState.diceValue !== 6) {
    return { success: false, error: 'Need 6 to spawn piece' };
  }

  const currentPlayer = getCurrentPlayer(gameState.turnManager);
  const spawnResult = spawnNewPiece(currentPlayer, gameState.diceValue);

  if (spawnResult.success) {
    gameState.history.push({
      type: 'spawn',
      playerId: currentPlayer.id,
      pieceIndex: spawnResult.piece.index,
      timestamp: Date.now()
    });

    gameState.turnPhase = 'wait_next';
  }

  return spawnResult;
}

/**
 * End current turn
 * @param {Object} gameState - Game state
 */
export function endTurn(gameState) {
  // Check for winner
  if (isGameOver(gameState.players)) {
    gameState.status = 'finished';
    gameState.winner = getWinner(gameState.players);
    gameState.finishedAt = Date.now();
    return;
  }

  const currentPlayer = getCurrentPlayer(gameState.turnManager);

  // Check for extra turn
  const hasExtraTurn = currentPlayer.consecutiveSixes > 0 && currentPlayer.consecutiveSixes < 3;

  if (!hasExtraTurn) {
    // Reset dice and move to next player
    gameState.diceValue = null;
    gameState.movablePieces = [];
    gameState.capturedThisTurn = [];
    gameState.selectedPiece = null;

    // Advance turn
    advanceTurn(gameState.turnManager);
  }

  gameState.currentPlayerIndex = gameState.turnManager.currentPlayerIndex;
  gameState.turnPhase = 'roll';
}

/**
 * Get valid moves for current player
 * @param {Object} gameState - Game state
 * @returns {Array<number>} Piece indices that can move
 */
export function getValidMoves(gameState) {
  if (gameState.diceValue === null) return [];

  const currentPlayer = getCurrentPlayer(gameState.turnManager);
  const validMoves = [];

  currentPlayer.pieces.forEach((piece, index) => {
    if (piece.isFinished) return;
    if (piece.position === -1 && gameState.diceValue !== 6) return;

    const newPos = calculateNewPosition(piece.position, gameState.diceValue);
    if (newPos !== null) {
      validMoves.push(index);
    }
  });

  return validMoves;
}

/**
 * Export game state to JSON (for saving/networking)
 * @param {Object} gameState - Game state
 * @returns {Object} Serializable game state
 */
export function serializeGameState(gameState) {
  return {
    id: gameState.id,
    status: gameState.status,
    diceValue: gameState.diceValue,
    currentPlayerIndex: gameState.currentPlayerIndex,
    turnCount: gameState.turnManager.turnCount,
    players: gameState.players.map(p => ({
      id: p.id,
      name: p.name,
      color: p.color,
      finishedPieces: p.finishedPieces,
      pieces: p.pieces.map(piece => ({
        id: piece.id,
        position: piece.position,
        isFinished: piece.isFinished
      }))
    })),
    winner: gameState.winner
  };
}

/**
 * Restore game state from JSON
 * @param {Object} serialized - Serialized game state
 * @param {Array<Object>} playerConfigs - Original player configs
 * @returns {Object} Game state
 */
export function deserializeGameState(serialized, playerConfigs) {
  const gameState = createGameState(playerConfigs);
  
  gameState.id = serialized.id;
  gameState.status = serialized.status;
  gameState.diceValue = serialized.diceValue;
  gameState.currentPlayerIndex = serialized.currentPlayerIndex;

  // Restore piece positions
  serialized.players.forEach((playerData, index) => {
    const player = gameState.players[index];
    player.finishedPieces = playerData.finishedPieces;

    playerData.pieces.forEach((pieceData, pieceIndex) => {
      const piece = player.pieces[pieceIndex];
      piece.position = pieceData.position;
      piece.isFinished = pieceData.isFinished;
    });
  });

  if (serialized.winner) {
    gameState.winner = serialized.winner;
  }

  return gameState;
}

/**
 * Reset game for new round
 * @param {Object} gameState - Game state
 */
export function resetGame(gameState) {
  gameState.players.forEach(p => resetPlayer(p));
  gameState.diceValue = null;
  gameState.movablePieces = [];
  gameState.selectedPiece = null;
  gameState.turnPhase = 'roll';
  gameState.capturedThisTurn = [];
  gameState.history = [];
  gameState.winner = null;
  gameState.status = 'playing';
  gameState.currentPlayerIndex = 0;

  const turnManager = initializeTurnManager(gameState.players);
  gameState.turnManager = turnManager;
}

export default {
  createGameState,
  startGame,
  rollDicePhase,
  movePiecePhase,
  spawnPiecePhase,
  endTurn,
  getValidMoves,
  serializeGameState,
  deserializeGameState,
  resetGame
};
