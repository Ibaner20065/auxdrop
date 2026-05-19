/**
 * Turn Manager
 * Handles turn rotation for 2-4 players dynamically
 */

/**
 * Initialize turn manager
 * @param {Array<Object>} players - Array of players
 * @returns {Object} Turn manager state
 */
export function initializeTurnManager(players) {
  return {
    players,
    currentPlayerIndex: 0,
    totalPlayers: players.length,
    turnCount: 0,
    history: []
  };
}

/**
 * Get current player
 * @param {Object} turnManager - Turn manager state
 * @returns {Object} Current player
 */
export function getCurrentPlayer(turnManager) {
  return turnManager.players[turnManager.currentPlayerIndex];
}

/**
 * Get next player
 * @param {Object} turnManager - Turn manager state
 * @param {number} steps - Number of players to skip (default 1)
 * @returns {Object} Next player
 */
export function getNextPlayer(turnManager, steps = 1) {
  const nextIndex = (turnManager.currentPlayerIndex + steps) % turnManager.totalPlayers;
  return turnManager.players[nextIndex];
}

/**
 * Advance to next turn
 * @param {Object} turnManager - Turn manager state
 * @param {boolean} skipCurrentPlayer - If true, skip to next player
 */
export function advanceTurn(turnManager, skipCurrentPlayer = false) {
  const currentPlayer = getCurrentPlayer(turnManager);
  
  // Record turn history
  turnManager.history.push({
    playerIndex: turnManager.currentPlayerIndex,
    playerColor: currentPlayer.color,
    turnCount: turnManager.turnCount,
    timestamp: Date.now()
  });

  if (skipCurrentPlayer) {
    // Skip to next player
    turnManager.currentPlayerIndex = (turnManager.currentPlayerIndex + 1) % turnManager.totalPlayers;
  } else if (currentPlayer.consecutiveSixes > 0) {
    // Extra turn - stay with same player (they'll roll again)
    return;
  } else {
    // Normal turn rotation
    turnManager.currentPlayerIndex = (turnManager.currentPlayerIndex + 1) % turnManager.totalPlayers;
  }

  turnManager.turnCount++;
}

/**
 * Set turn to specific player
 * @param {Object} turnManager - Turn manager state
 * @param {string} playerId - Player ID
 * @returns {boolean} Success
 */
export function setCurrentPlayer(turnManager, playerId) {
  const index = turnManager.players.findIndex(p => p.id === playerId);
  if (index === -1) return false;
  
  turnManager.currentPlayerIndex = index;
  return true;
}

/**
 * Get turn order
 * @param {Object} turnManager - Turn manager state
 * @returns {Array<Object>} Players in turn order
 */
export function getTurnOrder(turnManager) {
  const order = [];
  for (let i = 0; i < turnManager.totalPlayers; i++) {
    const index = (turnManager.currentPlayerIndex + i) % turnManager.totalPlayers;
    order.push(turnManager.players[index]);
  }
  return order;
}

/**
 * Reset turn manager
 * @param {Object} turnManager - Turn manager state
 */
export function resetTurnManager(turnManager) {
  turnManager.currentPlayerIndex = 0;
  turnManager.turnCount = 0;
  turnManager.history = [];
}

/**
 * Get turn statistics
 * @param {Object} turnManager - Turn manager state
 * @returns {Object} Statistics
 */
export function getTurnStats(turnManager) {
  const stats = {};
  
  turnManager.players.forEach(player => {
    const turns = turnManager.history.filter(h => h.playerColor === player.color).length;
    stats[player.color] = {
      name: player.name,
      turns,
      percentage: turnManager.turnCount > 0 
        ? ((turns / turnManager.turnCount) * 100).toFixed(1) + '%'
        : '0%'
    };
  });

  return stats;
}
