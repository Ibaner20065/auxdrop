/**
 * Game State Manager
 * Centralizes game state, turn management, and interaction logic
 */

class GameStateManager {
  constructor(soundManager) {
    this.soundManager = soundManager;
    this.gameState = null;
    this.lastDiceValue = null;
    this.isAwaitingPieceSelection = false;
    this.validMoves = [];
  }

  /**
   * Update game state
   * @param {Object} newState - New game state from server
   */
  updateState(newState) {
    this.gameState = newState;
    
    if (newState.status === 'playing' && newState.diceValue !== null) {
      this.isAwaitingPieceSelection = true;
    } else {
      this.isAwaitingPieceSelection = false;
    }
  }

  /**
   * Get current game state
   */
  getState() {
    return this.gameState;
  }

  /**
   * Check if it's player's turn
   * @param {string} userId - User ID to check
   */
  isPlayerTurn(userId) {
    return this.gameState?.currentPlayerId === userId && this.gameState?.status === 'playing';
  }

  /**
   * Check if game is active
   */
  isGameActive() {
    return this.gameState?.status === 'playing';
  }

  /**
   * Get player color
   * @param {string} userId - User ID
   */
  getPlayerColor(userId) {
    const player = this.gameState?.players?.find(p => p.userId === userId);
    return player?.color || null;
  }

  /**
   * Get current player
   */
  getCurrentPlayer() {
    return this.gameState?.players?.find(p => p.userId === this.gameState?.currentPlayerId);
  }

  /**
   * Check if piece is selectable
   * @param {string} color - Player color
   * @param {number} pawnIndex - Pawn index
   * @param {Array} selectablePawns - Array of selectable pawn indices
   */
  isPieceSelectable(color, pawnIndex, selectablePawns) {
    return color === this.getPlayerColor(this.gameState?.currentPlayerId) && 
           selectablePawns.includes(pawnIndex);
  }

  /**
   * Get message for current game state
   */
  getStatusMessage() {
    if (!this.gameState) return 'Loading...';
    
    if (this.gameState.status === 'waiting') {
      const playerCount = this.gameState.players?.length || 0;
      return `Waiting for players (${playerCount}/2-4)`;
    }
    
    if (this.gameState.status === 'finished') {
      return this.gameState.winner 
        ? `🏆 ${this.gameState.winner.name} wins!`
        : 'Game Over';
    }
    
    return 'Game in progress...';
  }

  /**
   * Get action message for current player
   * @param {string} userId - User ID
   */
  getActionMessage(userId) {
    if (!this.isPlayerTurn(userId)) {
      const currentPlayer = this.getCurrentPlayer();
      return currentPlayer ? `${currentPlayer.name}'s turn...` : 'Waiting for player...';
    }
    
    if (this.gameState.diceValue === null) {
      return 'Roll the dice!';
    }
    
    if (this.gameState.diceValue === 6) {
      return `You rolled a 6! Bring piece out or move existing piece.`;
    }
    
    return `You rolled ${this.gameState.diceValue}. Select a piece to move.`;
  }

  /**
   * Handle successful dice roll with sound
   */
  onDiceRolled(value) {
    this.lastDiceValue = value;
    if (this.soundManager) {
      this.soundManager.playTurnNotification();
    }
  }

  /**
   * Handle successful piece move with sound
   */
  onPieceMoved() {
    if (this.soundManager) {
      this.soundManager.playPieceMove();
    }
  }

  /**
   * Handle piece capture with sound
   */
  onPieceCapture() {
    if (this.soundManager) {
      this.soundManager.playCapture();
    }
  }

  /**
   * Handle game win with sound and effects
   */
  onGameWin(winner) {
    if (this.soundManager) {
      this.soundManager.playVictory();
    }
  }

  /**
   * Handle invalid move with sound and visual feedback
   */
  onInvalidMove() {
    if (this.soundManager) {
      this.soundManager.playInvalidMove();
    }
  }

  /**
   * Reset game state
   */
  reset() {
    this.gameState = null;
    this.lastDiceValue = null;
    this.isAwaitingPieceSelection = false;
    this.validMoves = [];
  }
}

export default GameStateManager;
