import { ludoJoin, ludoStart, ludoRoll, ludoMove } from '../services/socket.js';
import App from '../main.js';
import DiceRenderer from './dice-renderer.js';
import PieceRenderer from './piece-renderer.js';
import AnimationEngine from './animation-engine.js';
import SoundManager from './sound-manager.js';
import GameStateManager from './game-state-manager.js';

let pawnElements = {};
let previousPawns = null;
let animatingPawns = new Set();

// Initialize game systems
let diceRenderer = null;
let pieceRenderer = null;
let animationEngine = null;
let soundManager = null;
let gameStateManager = null;

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
  yellow: [[7,13],[7,12],[7,11],[7,10],[7,9]],
  blue: [[13,7],[12,7],[11,7],[10,7],[9,7]]
};

const BASE_PAWN_POSITIONS = {
  red: [[2,2],[2,3],[3,2],[3,3]],
  green: [[2,11],[2,12],[3,11],[3,12]],
  yellow: [[11,11],[11,12],[12,11],[12,12]],
  blue: [[11,2],[11,3],[12,2],[12,3]]
};

const ENTRY_POSITIONS = { red: 0, green: 13, yellow: 26, blue: 39 };
const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

const COLORS = ['red', 'green', 'yellow', 'blue'];
const COLOR_NAMES = { red: 'Red', green: 'Green', yellow: 'Yellow', blue: 'Blue' };

let currentGameState = null;

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

function getMappedColor(originalColor, myColor) {
  if (!myColor) return originalColor;
  const cIdx = COLORS.indexOf(originalColor);
  const myIdx = COLORS.indexOf(myColor);
  const mappedIdx = (cIdx - myIdx + 4) % 4;
  return COLORS[mappedIdx];
}

function isMyTurn(gameState) {
  return gameState?.currentPlayerId === App.state.userId;
}

export function renderLudoBoard(container) {
  if (!container) return;

  // Initialize game systems
  diceRenderer = new DiceRenderer();
  pieceRenderer = new PieceRenderer();
  animationEngine = new AnimationEngine();
  soundManager = new SoundManager();
  gameStateManager = new GameStateManager(soundManager);

  container.innerHTML = `
    <div class="ludo-container">
      <div class="ludo-sidebar">
        <div class="ludo-panel" style="padding: 12px;">
          <h3 style="margin-top:0; text-transform: uppercase; font-size:1.1rem;">Ludo Console</h3>
          <div id="ludo-players" style="margin-bottom: 12px;"></div>
          <div id="ludo-status" style="padding: 8px; margin-bottom: 12px; font-size: 0.9rem;">
            Loading...
          </div>
          <div id="ludo-join-area"></div>
          <button class="btn btn-primary" id="btn-roll-dice" style="width: 100%; font-size: 1.2rem; padding: 12px; font-weight: bold; display:none;">
            🎲 ROLL DICE
          </button>
          <div id="dice-result" style="text-align: center; font-size: 3rem; margin-top: 8px; min-height: 3rem;">
            -
          </div>
          <div id="ludo-message" style="font-size: 0.85rem; text-align: center; min-height: 1.5rem; margin-top: 8px;"></div>
        </div>
      </div>
      <div class="ludo-board-wrapper" style="position: relative;">
        <div class="ludo-board" id="ludo-board"></div>
        <div id="ludo-move-dialog" style="display:none; position:absolute; bottom:20px; left:50%; transform:translateX(-50%); z-index:100; text-align:center; min-width: 200px;">
           <div style="margin-bottom:10px;">Which piece to move?</div>
           <div id="ludo-move-options" style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;"></div>
           <button class="btn" onclick="document.getElementById('ludo-move-dialog').style.display='none'" style="margin-top:10px; padding:8px 16px; font-size:0.8rem;">Cancel</button>
        </div>
      </div>
    </div>
  `;
  
  drawBoard();
  attachDiceRollListener();
}

function drawBoard() {
  const boardEl = document.getElementById('ludo-board');
  if (!boardEl) return;
  boardEl.innerHTML = '';

  // Draw 4 corner bases
  const bases = [
    { color: 'red', r: 1, c: 1 },
    { color: 'green', r: 1, c: 10 },
    { color: 'blue', r: 10, c: 1 },
    { color: 'yellow', r: 10, c: 10 }
  ];

  bases.forEach(b => {
    const baseEl = document.createElement('div');
    baseEl.className = `ludo-base-container base-${b.color}`;
    baseEl.style.gridRow = `${b.r} / ${b.r + 6}`;
    baseEl.style.gridColumn = `${b.c} / ${b.c + 6}`;
    
    // Create the inner white square with 4 circular spots
    baseEl.innerHTML = `
      <div class="ludo-base-inner">
        <div class="ludo-spot"></div>
        <div class="ludo-spot"></div>
        <div class="ludo-spot"></div>
        <div class="ludo-spot"></div>
      </div>
    `;
    boardEl.appendChild(baseEl);
  });

  // Draw the center home triangles
  const homeEl = document.createElement('div');
  homeEl.className = 'ludo-home-center';
  homeEl.style.gridRow = '7 / 10';
  homeEl.style.gridColumn = '7 / 10';
  boardEl.appendChild(homeEl);

  // Draw the rest of the cells (paths)
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      // Skip the base areas (6x6 corners)
      if ((row < 6 && col < 6) || 
          (row < 6 && col > 8) || 
          (row > 8 && col < 6) || 
          (row > 8 && col > 8)) {
        continue;
      }
      
      // Skip the center home area (3x3 center)
      if (row >= 6 && row <= 8 && col >= 6 && col <= 8) {
        continue;
      }

      const cell = document.createElement('div');
      cell.className = 'ludo-cell';
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.style.gridRow = `${row + 1}`;
      cell.style.gridColumn = `${col + 1}`;

      if (row === 7 && col >= 1 && col <= 5) {
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

  // Update game state manager
  if (gameStateManager) {
    gameStateManager.updateState(gameState);
  }

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
    } else if (hasJoined && App.state.isHost && gameState.players.length >= 2) {
      joinArea.innerHTML = `<button class="btn btn-primary" id="btn-ludo-start" style="width:100%;padding:var(--space-3);font-size:1.1rem;background-color:var(--accent-green);">
        🚀 Start Ludo Game
      </button>`;
      document.getElementById('btn-ludo-start')?.addEventListener('click', async () => {
        const result = await ludoStart(App.state.code);
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
    
    // Play victory sound
    if (soundManager) soundManager.playVictory();
    
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

  // Check for captured pawns to animate
  if (previousPawns && gameState.status === 'playing') {
    for (const c of COLORS) {
      for (let i = 0; i < 4; i++) {
        const oldPos = previousPawns[c][i];
        const newPos = gameState.pawns[c][i];
        if (oldPos >= 0 && oldPos <= 56 && newPos === -1) {
          animateCapture(c, i, oldPos, myColor);
        }
      }
    }
  }
  previousPawns = JSON.parse(JSON.stringify(gameState.pawns));

  renderAllPawns(gameState);
}

function animateCapture(color, pawnIndex, fromPos, myColor) {
  const pawnId = `${color}-${pawnIndex}`;
  animatingPawns.add(pawnId);
  const el = pawnElements[pawnId];
  if (!el) return;
  
  // Play capture sound
  if (soundManager) soundManager.playCapture();
  
  el.style.transition = 'none';
  const displayColor = getMappedColor(color, myColor);
  let currentPos = fromPos;
  
  const interval = setInterval(() => {
    currentPos--;
    if (currentPos < 0) {
      clearInterval(interval);
      animatingPawns.delete(pawnId);
      el.style.transition = 'all 0.3s ease-in-out';
      renderAllPawns(currentGameState);
      return;
    }
    const gridPos = getPawnGridPosition(displayColor, currentPos, pawnIndex);
    if (gridPos) {
      const cellPct = 100 / 15;
      el.style.left = `${gridPos[1] * cellPct}%`;
      el.style.top = `${gridPos[0] * cellPct}%`;
      el.style.transform = 'scale(1)';
      el.style.zIndex = 20;
    }
  }, 30);
}

function showMoveDialog(movablePawns) {
  const dialog = document.getElementById('ludo-move-dialog');
  const options = document.getElementById('ludo-move-options');
  if (!dialog || !options) return;
  
  options.innerHTML = '';
  movablePawns.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = `Piece ${p.index + 1}`;
    btn.onclick = () => {
      dialog.style.display = 'none';
      handlePawnClick(p.index);
    };
    options.appendChild(btn);
  });
  
  dialog.style.display = 'block';
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
      // Play invalid move sound
      if (soundManager) soundManager.playInvalidMove();
    } else {
      // Play piece move sound on successful move
      if (soundManager) soundManager.playPieceMove();
    }
  });
}

function renderAllPawns(gameState) {
  const boardEl = document.getElementById('ludo-board');
  if (!boardEl || !pieceRenderer) return;
  
  const myColor = getMyColor(gameState);
  const myTurn = isMyTurn(gameState);
  const selectable = (myTurn && gameState.diceValue !== null) 
      ? getValidMoves(gameState.pawns, myColor, gameState.diceValue) 
      : [];

  const squareOccupants = {};
  
  // Calculate overlaps
  for (const originalColor of COLORS) {
    const pawns = gameState.pawns[originalColor];
    if (!pawns) continue;
    const displayColor = getMappedColor(originalColor, myColor);
    for (let i = 0; i < pawns.length; i++) {
      const pos = pawns[i];
      const gridPos = getPawnGridPosition(displayColor, pos, i);
      if (!gridPos) continue;
      const key = `${gridPos[0]}-${gridPos[1]}`;
      if (!squareOccupants[key]) squareOccupants[key] = [];
      squareOccupants[key].push({ originalColor, index: i, pos, displayColor });
    }
  }

  for (const originalColor of COLORS) {
    const pawns = gameState.pawns[originalColor];
    if (!pawns) continue;
    const displayColor = getMappedColor(originalColor, myColor);

    for (let i = 0; i < pawns.length; i++) {
      const pawnId = `${originalColor}-${i}`;
      if (animatingPawns.has(pawnId)) continue;
      
      const pos = pawns[i];
      const gridPos = getPawnGridPosition(displayColor, pos, i);
      
      let el = pawnElements[pawnId];
      if (!gridPos) {
        if (el) el.style.display = 'none';
        continue;
      }

      // Create piece if doesn't exist
      if (!el) {
        el = pieceRenderer.createPiece(displayColor, i);
        el.style.left = '0%';
        el.style.top = '0%';
        boardEl.appendChild(el);
        pawnElements[pawnId] = el;
      }

      el.style.display = 'flex';

      const key = `${gridPos[0]}-${gridPos[1]}`;
      const occupants = squareOccupants[key];
      const occupantIdx = occupants.findIndex(o => o.originalColor === originalColor && o.index === i);
      
      const cellPct = 100 / 15;
      let left = gridPos[1] * cellPct;
      let top = gridPos[0] * cellPct;
      let scale = 0.8;

      if (occupants.length > 1 && pos !== -1 && pos !== 57) {
        const subIdx = occupantIdx % 4;
        const tx = (subIdx % 2 === 0) ? -20 : 20;
        const ty = (subIdx < 2) ? -20 : 20;
        scale = 0.55;
        el.style.transform = `translate(${tx}%, ${ty}%) scale(${scale})`;
        el.innerHTML = `<span style="font-size:10px; color:white; font-weight:bold; text-shadow:1px 1px 0 #000;">${i + 1}</span>`;
      } else {
        el.style.transform = `scale(${scale})`;
        el.innerHTML = '';
      }

      el.style.left = `${left}%`;
      el.style.top = `${top}%`;
      
      // Interaction
      el.onclick = null;
      el.style.cursor = 'default';
      pieceRenderer.setMovableEffect(el, false);
      
      if (originalColor === myColor && selectable.includes(i)) {
        pieceRenderer.setMovableEffect(el, true);
        el.addEventListener('mouseover', () => pieceRenderer.setHoverEffect(el, true));
        el.addEventListener('mouseout', () => pieceRenderer.setHoverEffect(el, false));
        
        el.onclick = (e) => {
          e.stopPropagation();
          if (!myTurn || gameState.diceValue === null) return;
          
          const myMovableOnThisCell = occupants.filter(o => o.originalColor === myColor && selectable.includes(o.index));
          if (myMovableOnThisCell.length > 1) {
            showMoveDialog(myMovableOnThisCell);
          } else {
            handlePawnClick(i);
          }
        };
      }
    }
  }
}

function clearPawns() {
  Object.values(pawnElements).forEach(el => {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  });
  pawnElements = {};
}

/**
 * Attach dice roll event listener
 */
function attachDiceRollListener() {
  document.addEventListener('click', handleDiceRollClick, true);
}

/**
 * Handle dice roll button click
 */
function handleDiceRollClick(e) {
  if (e.target.id !== 'btn-roll-dice') return;
  if (!diceRenderer || diceRenderer.isCurrentlyRolling()) return;

  const btn = e.target;
  const msgEl = document.getElementById('ludo-message');

  // Disable button and start roll animation
  btn.disabled = true;
  btn.textContent = '🎲 Rolling...';

  // Play dice roll sound
  soundManager.playDiceRoll();

  // Start dice animation
  diceRenderer.rollDice(async (finalValue) => {
    // Send roll to server
    ludoRoll(App.state.code).then(result => {
      btn.disabled = false;
      btn.textContent = '🎲 ROLL DICE';

      if (result.error) {
        if (msgEl) msgEl.textContent = result.error;
        soundManager.playInvalidMove();
        return;
      }

      if (result.threeSixes) {
        if (msgEl) msgEl.textContent = 'Three 6s in a row! Turn lost!';
        soundManager.playInvalidMove();
        return;
      }

      if (result.noMoves) {
        if (msgEl) msgEl.textContent = `Rolled ${result.value} — No valid moves`;
        soundManager.playInvalidMove();
        return;
      }

      // Play turn notification sound
      soundManager.playTurnNotification();
      
      if (msgEl) {
        if (result.value === 6) {
          msgEl.textContent = `You rolled a 6! Extra turn. Select a piece to move or bring new piece out.`;
        } else {
          msgEl.textContent = `You rolled ${result.value}! Select a piece to move.`;
        }
      }
    }).catch(() => {
      btn.disabled = false;
      btn.textContent = '🎲 ROLL DICE';
      soundManager.playInvalidMove();
    });
  });
}

// Initialize sounds on user interaction
document.addEventListener('click', () => {
  if (soundManager) soundManager.resumeContext();
}, { once: true });
