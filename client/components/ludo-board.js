import { ludoJoin, ludoRoll, ludoMove } from '../services/socket.js';
import App from '../main.js';

const PATH = [
  [6,0],[6,1],[6,2],[6,3],[6,4],[6,5],
  [5,6],[4,6],[3,6],[2,6],[1,6],
  [0,6],[0,7],[0,8],
  [1,8],[2,8],[3,8],[4,8],[5,8],
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
  [7,14],
  [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],
  [9,8],[10,8],[11,8],[12,8],[13,8],
  [14,8],[14,7],[14,6],
  [13,6],[12,6],[11,6],[10,6],[9,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
  [7,0]
];

const HOME_STRETCH = {
  red: [[7,1],[7,2],[7,3],[7,4],[7,5]],
  green: [[1,7],[2,7],[3,7],[4,7],[5,7]],
  blue: [[7,13],[7,12],[7,11],[7,10],[7,9]],
  yellow: [[13,7],[12,7],[11,7],[10,7],[9,7]]
};

const BASE_PAWN_POSITIONS = {
  red: [[2,2],[2,3],[3,2],[3,3]],
  green: [[2,11],[2,12],[3,11],[3,12]],
  blue: [[11,2],[11,3],[12,2],[12,3]],
  yellow: [[11,11],[11,12],[12,11],[12,12]]
};

const ENTRY_POSITIONS = { red: 0, green: 13, blue: 26, yellow: 39 };
const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

const COLORS = ['red', 'green', 'blue', 'yellow'];
const COLOR_NAMES = { red: 'Red', green: 'Green', blue: 'Blue', yellow: 'Yellow' };

let currentGameState = null;
let isRolling = false;

function getPawnGridPosition(color, pos, pawnIndex) {
  if (pos === -1) return BASE_PAWN_POSITIONS[color][pawnIndex];
  if (pos <= 51) {
    const sharedIdx = (pos + ENTRY_POSITIONS[color]) % 52;
    return PATH[sharedIdx];
  }
  if (pos <= 56) return HOME_STRETCH[color][pos - 52];
  return null;
}

function getValidMoves(pawns, color, diceValue) {
  const valid = [];
  for (let i = 0; i < 4; i++) {
    const pos = pawns[color][i];
    if (pos === 57) continue;
    if (pos === -1 && diceValue !== 6) continue;
    const newPos = getNewPosition(pos, diceValue);
    if (newPos !== -1) valid.push(i);
  }
  return valid;
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
    if (newPos === 57) return 57;
    if (newPos < 57) return newPos;
    return -1;
  }
  return -1;
}

function getMyColor(gameState) {
  if (!gameState || !gameState.players) return null;
  const me = gameState.players.find(p => p.userId === App.state.userId);
  return me ? me.color : null;
}

function isMyTurn(gameState) {
  return gameState?.currentPlayerId === App.state.userId;
}

export function renderLudoBoard(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="ludo-container">
      <div class="ludo-sidebar">
        <div class="ludo-panel" style="background: var(--bg-primary); border: var(--border-outset); padding: var(--space-3);">
          <h3 style="margin-top:0; font-family: var(--font-heading); text-transform: uppercase; font-size:1.1rem;">Ludo Console</h3>
          <div id="ludo-players" style="margin-bottom: var(--space-3);"></div>
          <div id="ludo-status" style="background: #fff; border: var(--border-inset); padding: var(--space-2); margin-bottom: var(--space-3); font-family: var(--font-mono); font-size: 0.9rem;">
            Loading...
          </div>
          <div id="ludo-join-area"></div>
          <button class="btn btn-primary" id="btn-roll-dice" style="width: 100%; font-size: 1.2rem; padding: var(--space-3); font-weight: bold; display:none;">
            🎲 ROLL DICE
          </button>
          <div id="dice-result" style="text-align: center; font-size: 3rem; margin-top: 0.5rem; text-shadow: 2px 2px 0 #000; min-height: 3rem;">
            -
          </div>
          <div id="ludo-message" style="font-family: var(--font-mono); font-size: 0.85rem; text-align: center; min-height: 1.5rem; color: var(--accent-red);"></div>
        </div>
      </div>
      <div class="ludo-board-wrapper">
        <div class="ludo-board" id="ludo-board"></div>
      </div>
    </div>
  `;
  drawBoard();
}

function drawBoard() {
  const boardEl = document.getElementById('ludo-board');
  if (!boardEl) return;
  boardEl.innerHTML = '';

  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      const cell = document.createElement('div');
      cell.className = 'ludo-cell';
      cell.dataset.row = row;
      cell.dataset.col = col;

      if (row < 6 && col < 6) {
        cell.classList.add('ludo-base-red');
      } else if (row < 6 && col > 8) {
        cell.classList.add('ludo-base-green');
      } else if (row > 8 && col < 6) {
        cell.classList.add('ludo-base-blue');
      } else if (row > 8 && col > 8) {
        cell.classList.add('ludo-base-yellow');
      } else if (row >= 6 && row <= 8 && col >= 6 && col <= 8) {
        cell.classList.add('ludo-home');
        if (row === 7 && col === 7) cell.innerHTML = '🏠';
      } else if (row === 7 && col >= 1 && col <= 5) {
        cell.classList.add('ludo-path-red');
      } else if (col === 7 && row >= 1 && row <= 5) {
        cell.classList.add('ludo-path-green');
      } else if (col === 7 && row >= 9 && row <= 13) {
        cell.classList.add('ludo-path-blue');
      } else if (row === 7 && col >= 9 && col <= 13) {
        cell.classList.add('ludo-path-yellow');
      } else {
        cell.classList.add('ludo-path');
        if (SAFE_SQUARES.has(PATH.findIndex(p => p[0] === row && p[1] === col))) {
          cell.innerHTML = '⭐';
          cell.style.fontSize = '0.7rem';
          cell.style.display = 'flex';
          cell.style.alignItems = 'center';
          cell.style.justifyContent = 'center';
        }
      }

      boardEl.appendChild(cell);
    }
  }
}

export function updateLudoBoard(gameState) {
  if (!gameState) return;
  currentGameState = gameState;

  const myColor = getMyColor(gameState);
  const myTurn = isMyTurn(gameState);
  const statusEl = document.getElementById('ludo-status');
  const diceEl = document.getElementById('dice-result');
  const rollBtn = document.getElementById('btn-roll-dice');
  const joinArea = document.getElementById('ludo-join-area');
  const msgEl = document.getElementById('ludo-message');
  const playersEl = document.getElementById('ludo-players');

  if (!statusEl) return;

  // Update player list
  if (playersEl) {
    playersEl.innerHTML = gameState.players.map(p => {
      const isCurrent = p.userId === gameState.currentPlayerId;
      return `<div style="display:flex;align-items:center;gap:6px;padding:2px 0;${isCurrent ? 'font-weight:bold;' : ''}">
        <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${p.color};border:2px solid #000;"></span>
        <span>${p.name}</span>
        ${isCurrent ? '<span style="font-size:0.7rem;color:var(--accent-green);">◀ TURN</span>' : ''}
        ${p.userId === App.state.userId ? '<span style="font-size:0.7rem;color:var(--text-muted);">(you)</span>' : ''}
      </div>`;
    }).join('');
  }

  // Handle waiting state
  if (gameState.status === 'waiting') {
    const hasJoined = gameState.players.some(p => p.userId === App.state.userId);
    statusEl.textContent = hasJoined
      ? `Waiting for more players... (${gameState.players.length}/2)`
      : 'Join the Ludo game!';

    rollBtn.style.display = 'none';
    diceEl.textContent = '🎲';
    msgEl.textContent = '';

    if (!hasJoined && gameState.players.length < 4) {
      joinArea.innerHTML = `<button class="btn btn-primary" id="btn-ludo-join" style="width:100%;padding:var(--space-3);font-size:1.1rem;">
        🎮 Join Ludo Game
      </button>`;
      document.getElementById('btn-ludo-join')?.addEventListener('click', async () => {
        const result = await ludoJoin(App.state.code);
        if (result.error) {
          msgEl.textContent = result.error;
        }
      });
    } else {
      joinArea.innerHTML = '';
    }

    clearPawns();
    return;
  }

  joinArea.innerHTML = '';

  // Game is playing or finished
  if (gameState.status === 'finished') {
    statusEl.textContent = gameState.winner
      ? `🏆 ${gameState.winner.name} (${COLOR_NAMES[gameState.winner.color]}) wins!`
      : 'Game Over';
    rollBtn.style.display = 'none';
    diceEl.textContent = '🏆';
    msgEl.textContent = '';
    renderAllPawns(gameState);
    return;
  }

  // Playing state
  const canRoll = myTurn && gameState.diceValue === null && !isRolling;

  if (myTurn) {
    statusEl.textContent = `Your turn (${COLOR_NAMES[myColor]})`;
    if (gameState.diceValue === null && !isRolling) {
      statusEl.textContent = `🎯 Your turn - Roll the dice!`;
    } else if (gameState.diceValue !== null) {
      statusEl.textContent = `🎯 Select a pawn to move (dice: ${gameState.diceValue})`;
    }
  } else {
    const currentPlayer = gameState.players.find(p => p.userId === gameState.currentPlayerId);
    statusEl.textContent = currentPlayer
      ? `${currentPlayer.name}'s turn (${COLOR_NAMES[currentPlayer.color]})`
      : 'Waiting...';
  }

  rollBtn.style.display = canRoll ? 'block' : 'none';

  if (gameState.diceValue !== null) {
    diceEl.textContent = gameState.diceValue;
  }

  msgEl.textContent = '';

  renderAllPawns(gameState);

  // Handle pawn clicking for moves
  if (myTurn && gameState.diceValue !== null) {
    const selectable = getValidMoves(gameState.pawns, myColor, gameState.diceValue);
    document.querySelectorAll('.ludo-pawn').forEach(el => {
      const idx = parseInt(el.dataset.pawnIndex);
      if (selectable.includes(idx)) {
        el.style.cursor = 'pointer';
        el.style.boxShadow = '0 0 0 3px yellow, 2px 2px 0 rgba(0,0,0,0.3)';
        el.addEventListener('click', () => handlePawnClick(idx));
      }
    });
  }
}

function handlePawnClick(pawnIndex) {
  if (isRolling) return;
  isRolling = true;
  const rollBtn = document.getElementById('btn-roll-dice');
  if (rollBtn) rollBtn.style.display = 'none';

  ludoMove(App.state.code, pawnIndex).then(result => {
    isRolling = false;
    if (result.error) {
      const msgEl = document.getElementById('ludo-message');
      if (msgEl) msgEl.textContent = result.error;
    }
  });
}

function renderAllPawns(gameState) {
  clearPawns();

  for (const color of COLORS) {
    const pawns = gameState.pawns[color];
    if (!pawns) continue;
    for (let i = 0; i < pawns.length; i++) {
      const pos = pawns[i];
      const gridPos = getPawnGridPosition(color, pos, i);
      if (!gridPos) continue;
      drawPawn(gridPos[0], gridPos[1], color, i);
    }
  }
}

function clearPawns() {
  document.querySelectorAll('.ludo-pawn').forEach(el => el.remove());
}

function drawPawn(row, col, color, pawnIndex) {
  const boardEl = document.getElementById('ludo-board');
  if (!boardEl) return;

  const cell = boardEl.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  if (!cell) return;

  const existing = cell.querySelectorAll('.ludo-pawn');
  const offset = existing.length;

  const pawn = document.createElement('div');
  pawn.className = `ludo-pawn pawn-${color}`;
  pawn.dataset.pawnIndex = pawnIndex;
  pawn.dataset.color = color;

  if (offset > 0) {
    pawn.style.top = `${10 + offset * 20}%`;
    pawn.style.left = `${10 + offset * 20}%`;
    pawn.style.width = '60%';
    pawn.style.height = '60%';
  }

  cell.appendChild(pawn);
}

// Attach dice roll event once on first render
document.addEventListener('click', (e) => {
  if (e.target.id === 'btn-roll-dice') {
    if (isRolling) return;
    isRolling = true;

    const btn = e.target;
    const diceEl = document.getElementById('dice-result');
    const msgEl = document.getElementById('ludo-message');

    btn.disabled = true;
    btn.textContent = '🎲 Rolling...';

    let rolls = 0;
    const rollInterval = setInterval(() => {
      diceEl.textContent = Math.floor(Math.random() * 6) + 1;
      rolls++;
      if (rolls > 10) {
        clearInterval(rollInterval);

        ludoRoll(App.state.code).then(result => {
          isRolling = false;
          btn.disabled = false;
          btn.textContent = '🎲 ROLL DICE';

          if (result.error) {
            if (msgEl) msgEl.textContent = result.error;
            return;
          }

          if (result.threeSixes) {
            if (msgEl) msgEl.textContent = 'Three 6s in a row! Turn lost!';
            return;
          }

          if (result.noMoves) {
            if (msgEl) msgEl.textContent = `Rolled ${result.value} — No valid moves`;
            return;
          }

          diceEl.textContent = result.value;
        }).catch(() => {
          isRolling = false;
          btn.disabled = false;
          btn.textContent = '🎲 ROLL DICE';
        });
      }
    }, 50);
  }
});
