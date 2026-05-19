const ludoGames = new Map();

const COLORS = ['red', 'green', 'yellow', 'blue'];

const PATH_SIZE = 52;
const HOME_STRETCH_SIZE = 5;
const HOME_POSITION = 57;

const ENTRY_POSITIONS = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

const HOME_STRETCH_ENTRY = {
  red: 51,
  green: 12,
  yellow: 25,
  blue: 38,
};

const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

function createNewGame() {
  return {
    players: [],
    turnIndex: 0,
    diceValue: null,
    pawns: {
      red: [-1, -1, -1, -1],
      green: [-1, -1, -1, -1],
      blue: [-1, -1, -1, -1],
      yellow: [-1, -1, -1, -1],
    },
    status: 'waiting',
    winner: null,
    consecutiveSixes: 0,
  };
}

function rollDiceValue() {
  return Math.floor(Math.random() * 6) + 1;
}

function getNewPosition(currentPos, diceValue) {
  if (currentPos === -1 && diceValue === 6) return 0;
  if (currentPos === -1) return -1;
  if (currentPos >= 0 && currentPos <= 51) {
    const newPos = currentPos + diceValue;
    if (newPos <= 51) return newPos;
    if (newPos === 52) return 52;
    if (newPos <= 57) return newPos;
    return -1;
  }
  if (currentPos >= 52 && currentPos <= 56) {
    const newPos = currentPos + diceValue;
    if (newPos === HOME_POSITION) return HOME_POSITION;
    if (newPos < HOME_POSITION) return newPos;
    return -1;
  }
  // Already home (57) or invalid
  return -1;
}

function getValidMoves(pawns, color, diceValue) {
  const valid = [];
  for (let i = 0; i < 4; i++) {
    const pos = pawns[color][i];
    if (pos === HOME_POSITION) continue;
    if (pos === -1 && diceValue !== 6) continue;
    const newPos = getNewPosition(pos, diceValue);
    if (newPos !== -1) valid.push(i);
  }
  return valid;
}

function sharedPathIndex(color, relativePos) {
  return (relativePos + ENTRY_POSITIONS[color]) % PATH_SIZE;
}

function checkCapture(pawns, color, pawnIndex, newPos) {
  if (newPos < 0 || newPos > 51) return null;
  const sharedIdx = sharedPathIndex(color, newPos);
  if (SAFE_SQUARES.has(sharedIdx)) return null;
  for (const otherColor of COLORS) {
    if (otherColor === color) continue;
    for (let i = 0; i < 4; i++) {
      const otherPos = pawns[otherColor][i];
      if (otherPos >= 0 && otherPos <= 51) {
        if (sharedPathIndex(otherColor, otherPos) === sharedIdx) {
          return { color: otherColor, pawnIndex: i };
        }
      }
    }
  }
  return null;
}

function checkAllHome(pawns, color) {
  return pawns[color].every(p => p === HOME_POSITION);
}

function advanceTurn(game) {
  const activePlayers = game.players.filter(p => pawnsExist(game.pawns[p.color]));
  if (activePlayers.length === 0) return;
  let nextIndex = game.turnIndex;
  let attempts = 0;
  do {
    nextIndex = (nextIndex + 1) % game.players.length;
    attempts++;
    if (attempts > game.players.length * 2) break;
  } while (!pawnsExist(game.pawns[game.players[nextIndex].color]));
  game.turnIndex = nextIndex;
}

function pawnsExist(pawns) {
  return pawns.some(p => p !== HOME_POSITION);
}

export function initGame(code) {
  if (!ludoGames.has(code)) {
    ludoGames.set(code, createNewGame());
  }
  return ludoGames.get(code);
}

export function joinGame(code, userId, userName) {
  const game = ludoGames.get(code);
  if (!game) return { error: 'Ludo game not initialized' };
  if (game.status !== 'waiting') return { error: 'Game already started' };
  if (game.players.some(p => p.userId === userId)) return { error: 'Already joined' };
  if (game.players.length >= 4) return { error: 'Game is full (max 4 players)' };

  const color = COLORS[game.players.length];
  game.players.push({ userId, color, name: userName });

  return { success: true, color, gameState: getPublicState(code, userId) };
}

export function leaveGame(code, userId) {
  const game = ludoGames.get(code);
  if (!game) return;

  const idx = game.players.findIndex(p => p.userId === userId);
  if (idx === -1) return;

  const player = game.players[idx];

  // If player's turn, advance
  if (game.turnIndex === idx && game.status === 'playing') {
    advanceTurn(game);
  }

  // Remove player
  game.players.splice(idx, 1);

  // Reset their pawns
  game.pawns[player.color] = [-1, -1, -1, -1];

  // Adjust turnIndex if needed
  if (game.turnIndex >= game.players.length && game.players.length > 0) {
    game.turnIndex = 0;
  }

  // Reset game if too few players
  if (game.players.length < 2 && game.status === 'playing') {
    game.status = 'waiting';
    // Reset all pawns
    for (const p of game.players) {
      game.pawns[p.color] = [-1, -1, -1, -1];
    }
    game.diceValue = null;
    game.turnIndex = 0;
    game.consecutiveSixes = 0;
    game.winner = null;
  }

  if (game.players.length === 0) {
    ludoGames.delete(code);
  }
}

export function rollDice(code, userId) {
  const game = ludoGames.get(code);
  if (!game) return { error: 'Game not found' };
  if (game.status !== 'playing') return { error: 'Game not in progress' };

  const playerIdx = game.players.findIndex(p => p.userId === userId);
  if (playerIdx === -1) return { error: 'Not in this game' };
  if (playerIdx !== game.turnIndex) return { error: 'Not your turn' };
  if (game.diceValue !== null) return { error: 'Already rolled, make a move' };

  const value = rollDiceValue();
  game.diceValue = value;
  game.consecutiveSixes = (value === 6) ? game.consecutiveSixes + 1 : 0;

  // Three consecutive 6s = lose turn
  if (game.consecutiveSixes >= 3) {
    game.diceValue = null;
    game.consecutiveSixes = 0;
    advanceTurn(game);
    return {
      value,
      consumed: true,
      threeSixes: true,
      advanced: true,
      nextPlayerColor: game.players[game.turnIndex]?.color || null,
    };
  }

  const color = game.players[playerIdx].color;
  const validMoves = getValidMoves(game.pawns, color, value);

  if (validMoves.length === 0) {
    // No valid moves, advance turn
    game.diceValue = null;
    advanceTurn(game);
    return {
      value,
      consumed: true,
      noMoves: true,
      advanced: true,
      nextPlayerColor: game.players[game.turnIndex]?.color || null,
    };
  }

  return {
    value,
    consumed: false,
    validMoves,
    noMoves: false,
  };
}

export function movePawn(code, userId, pawnIndex) {
  const game = ludoGames.get(code);
  if (!game) return { error: 'Game not found' };
  if (game.status !== 'playing') return { error: 'Game not in progress' };

  const playerIdx = game.players.findIndex(p => p.userId === userId);
  if (playerIdx === -1) return { error: 'Not in this game' };
  if (playerIdx !== game.turnIndex) return { error: 'Not your turn' };
  if (game.diceValue === null) return { error: 'Roll the dice first' };

  const color = game.players[playerIdx].color;
  const diceValue = game.diceValue;
  const pos = game.pawns[color][pawnIndex];

  if (pos === HOME_POSITION) return { error: 'Pawn already home' };
  if (pos === -1 && diceValue !== 6) return { error: 'Need a 6 to leave base' };

  const newPos = getNewPosition(pos, diceValue);
  if (newPos === -1) return { error: 'Invalid move' };

  // Check if this is a valid move
  const validMoves = getValidMoves(game.pawns, color, diceValue);
  if (!validMoves.includes(pawnIndex)) return { error: 'Pawn cannot move' };

  game.pawns[color][pawnIndex] = newPos;

  // Check for capture
  const capture = checkCapture(game.pawns, color, pawnIndex, newPos);
  let captured = null;
  if (capture) {
    game.pawns[capture.color][capture.pawnIndex] = -1;
    captured = capture;
  }

  // Check for win
  let winner = null;
  if (checkAllHome(game.pawns, color)) {
    winner = { userId, color, name: game.players[playerIdx].name };
    game.winner = winner;
    game.status = 'finished';
  }

  // Determine bonus roll
  const isSix = diceValue === 6;
  const hasCapture = captured !== null;
  const bonusRoll = (isSix || hasCapture) && game.status === 'playing';

  // Reset dice
  game.diceValue = null;

  if (!bonusRoll && game.status === 'playing') {
    game.consecutiveSixes = 0;
    advanceTurn(game);
  }

  return {
    moved: true,
    pawnIndex,
    newPos,
    captured,
    bonusRoll,
    winner,
    isSix,
    advanced: !bonusRoll && game.status === 'playing',
    nextPlayerColor: !bonusRoll && game.status === 'playing' ? game.players[game.turnIndex]?.color : null,
  };
}

export function getPublicState(code, userId) {
  const game = ludoGames.get(code);
  if (!game) return null;

  return {
    players: game.players.map(p => ({ userId: p.userId, color: p.color, name: p.name })),
    currentPlayerId: game.players[game.turnIndex]?.userId || null,
    diceValue: game.diceValue,
    pawns: game.pawns,
    status: game.status,
    winner: game.winner,
    consecutiveSixes: game.consecutiveSixes,
  };
}

export function getGame(code) {
  return ludoGames.get(code) || null;
}

export function getPlayerCount(code) {
  const game = ludoGames.get(code);
  return game ? game.players.length : 0;
}

export function startGame(code, userId) {
  const game = ludoGames.get(code);
  if (!game) return { error: 'Game not found' };
  if (game.status !== 'waiting') return { error: 'Game already started' };
  if (game.players.length < 2) return { error: 'Need at least 2 players' };
  
  // Optionally, check if user is host (since we don't have host info directly in ludoGames, 
  // we rely on the socket endpoint to enforce it)
  game.status = 'playing';
  return { success: true, gameState: getPublicState(code) };
}
