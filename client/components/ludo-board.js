export function renderLudoBoard(container) {
  if (!container) return;

  container.innerHTML = `
    <div class="ludo-container">
      <div class="ludo-sidebar">
        <div class="ludo-panel" style="background: var(--bg-primary); border: var(--border-outset); padding: var(--space-3);">
          <h3 style="margin-top:0; font-family: var(--font-heading); text-transform: uppercase;">Ludo Console</h3>
          <div class="ludo-status" id="ludo-status" style="background: #fff; border: var(--border-inset); padding: var(--space-2); margin-bottom: var(--space-3); font-family: var(--font-mono); font-size: 0.9rem;">
            Waiting for players...
          </div>
          <button class="btn btn-primary" id="btn-roll-dice" style="width: 100%; font-size: 1.2rem; padding: var(--space-3); font-weight: bold;">
            🎲 ROLL DICE
          </button>
          <div id="dice-result" style="text-align: center; font-size: 3rem; margin-top: 1rem; text-shadow: 2px 2px 0 #000;">
            -
          </div>
        </div>
      </div>
      <div class="ludo-board-wrapper">
        <div class="ludo-board" id="ludo-board"></div>
      </div>
    </div>
  `;

  drawBoard();
  attachEvents();
}

function drawBoard() {
  const boardEl = document.getElementById('ludo-board');
  if (!boardEl) return;

  // 15x15 grid
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      const cell = document.createElement('div');
      cell.className = 'ludo-cell';
      cell.dataset.row = row;
      cell.dataset.col = col;

      // Color top-left (Red Base)
      if (row < 6 && col < 6) {
        cell.classList.add('ludo-base-red');
      }
      // Color top-right (Green Base)
      else if (row < 6 && col > 8) {
        cell.classList.add('ludo-base-green');
      }
      // Color bottom-left (Blue Base)
      else if (row > 8 && col < 6) {
        cell.classList.add('ludo-base-blue');
      }
      // Color bottom-right (Yellow Base)
      else if (row > 8 && col > 8) {
        cell.classList.add('ludo-base-yellow');
      }
      // Center Home
      else if (row >= 6 && row <= 8 && col >= 6 && col <= 8) {
        cell.classList.add('ludo-home');
        if (row === 7 && col === 7) cell.innerHTML = '🏠';
      }
      // Red Home Stretch
      else if (row === 7 && col >= 1 && col <= 5) {
        cell.classList.add('ludo-path-red');
      }
      // Green Home Stretch
      else if (col === 7 && row >= 1 && row <= 5) {
        cell.classList.add('ludo-path-green');
      }
      // Blue Home Stretch
      else if (col === 7 && row >= 9 && row <= 13) {
        cell.classList.add('ludo-path-blue');
      }
      // Yellow Home Stretch
      else if (row === 7 && col >= 9 && col <= 13) {
        cell.classList.add('ludo-path-yellow');
      }
      // Standard path cells
      else {
        cell.classList.add('ludo-path');
        // Add some stars for safe zones
        if ((row === 6 && col === 1) || (row === 1 && col === 8) || (row === 8 && col === 13) || (row === 13 && col === 6) ||
            (row === 2 && col === 6) || (row === 6 && col === 12) || (row === 12 && col === 8) || (row === 8 && col === 2)) {
          cell.innerHTML = '⭐';
          cell.style.fontSize = '0.8rem';
          cell.style.display = 'flex';
          cell.style.alignItems = 'center';
          cell.style.justifyContent = 'center';
        }
      }

      boardEl.appendChild(cell);
    }
  }

  // Draw initial pawns in bases (mockup)
  drawMockPawn(2, 2, 'red');
  drawMockPawn(2, 3, 'red');
  drawMockPawn(3, 2, 'red');
  drawMockPawn(3, 3, 'red');

  drawMockPawn(2, 11, 'green');
  drawMockPawn(2, 12, 'green');
  drawMockPawn(3, 11, 'green');
  drawMockPawn(3, 12, 'green');

  drawMockPawn(11, 2, 'blue');
  drawMockPawn(11, 3, 'blue');
  drawMockPawn(12, 2, 'blue');
  drawMockPawn(12, 3, 'blue');

  drawMockPawn(11, 11, 'yellow');
  drawMockPawn(11, 12, 'yellow');
  drawMockPawn(12, 11, 'yellow');
  drawMockPawn(12, 12, 'yellow');
}

function drawMockPawn(row, col, color) {
  const boardEl = document.getElementById('ludo-board');
  if (!boardEl) return;
  
  const cell = boardEl.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  if (cell) {
    const pawn = document.createElement('div');
    pawn.className = `ludo-pawn pawn-${color}`;
    cell.appendChild(pawn);
  }
}

function attachEvents() {
  const btn = document.getElementById('btn-roll-dice');
  if (btn) {
    btn.addEventListener('click', () => {
      // Temporary mock roll for the UI
      btn.disabled = true;
      let rolls = 0;
      const resultEl = document.getElementById('dice-result');
      
      const rollInterval = setInterval(() => {
        resultEl.textContent = Math.floor(Math.random() * 6) + 1;
        rolls++;
        if (rolls > 10) {
          clearInterval(rollInterval);
          const finalRoll = Math.floor(Math.random() * 6) + 1;
          resultEl.textContent = finalRoll;
          document.getElementById('ludo-status').textContent = `Rolled a ${finalRoll}!`;
          setTimeout(() => { btn.disabled = false; }, 1000);
        }
      }, 50);
    });
  }
}
