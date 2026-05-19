/**
 * Piece Rendering System
 * Handles 3D-style game piece rendering with glossy appearance and depth effects
 */

class PieceRenderer {
  constructor() {
    this.pieceElements = {};
    this.pieceColors = {
      red: '#ff4444',
      green: '#44ff44',
      yellow: '#ffff44',
      blue: '#4444ff'
    };
  }

  /**
   * Create a 3D-style game piece element
   * @param {string} color - Piece color (red, green, yellow, blue)
   * @param {number} pawnIndex - Index of pawn (0-3)
   * @returns {HTMLElement} Styled piece element
   */
  createPiece(color, pawnIndex) {
    const piece = document.createElement('div');
    const pawnId = `${color}-${pawnIndex}`;
    
    piece.className = `ludo-pawn ludo-piece-3d pawn-${color}`;
    piece.dataset.pawnIndex = pawnIndex;
    piece.dataset.originalColor = color;
    piece.dataset.piecId = pawnId;
    
    // Create the piece with 3D effect using nested divs
    const baseColor = this.pieceColors[color];
    
    piece.innerHTML = `
      <div class="piece-outer" style="
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: radial-gradient(circle at 30% 30%, ${this.lightenColor(baseColor, 40)}, ${this.darkenColor(baseColor, 30)});
        box-shadow: 
          0 2px 4px rgba(0, 0, 0, 0.4),
          inset -1px -1px 3px rgba(0, 0, 0, 0.3),
          inset 1px 1px 3px rgba(255, 255, 255, 0.3);
        position: relative;
      ">
        <div class="piece-highlight" style="
          position: absolute;
          top: 20%;
          left: 20%;
          width: 30%;
          height: 30%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0));
          border-radius: 50%;
          box-shadow: 0 1px 2px rgba(255, 255, 255, 0.4);
        "></div>
      </div>
    `;
    
    piece.style.position = 'absolute';
    piece.style.width = 'calc(100% / 15)';
    piece.style.height = 'calc(100% / 15)';
    piece.style.display = 'flex';
    piece.style.alignItems = 'center';
    piece.style.justifyContent = 'center';
    piece.style.cursor = 'default';
    piece.style.transition = 'all 0.3s ease-in-out';
    piece.style.zIndex = '10';
    
    this.pieceElements[pawnId] = piece;
    return piece;
  }

  /**
   * Update piece position with animation
   * @param {HTMLElement} piece - Piece element
   * @param {number} row - Grid row
   * @param {number} col - Grid column
   * @param {boolean} animate - Whether to animate movement
   */
  updatePiecePosition(piece, row, col, animate = true) {
    const cellPct = 100 / 15;
    const left = `${col * cellPct}%`;
    const top = `${row * cellPct}%`;
    
    if (animate && piece.style.left !== left && piece.style.top !== top) {
      piece.style.transition = 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    } else {
      piece.style.transition = 'none';
    }
    
    piece.style.left = left;
    piece.style.top = top;
  }

  /**
   * Apply hover effect to piece
   * @param {HTMLElement} piece - Piece element
   * @param {boolean} isHovering - Is mouse hovering
   */
  setHoverEffect(piece, isHovering) {
    if (isHovering) {
      piece.style.transform = 'scale(1.15)';
      piece.style.boxShadow = '0 0 15px rgba(255, 255, 0, 0.6), 0 4px 8px rgba(0, 0, 0, 0.3)';
      piece.style.zIndex = '20';
    } else {
      piece.style.transform = 'scale(1)';
      piece.style.boxShadow = '';
      piece.style.zIndex = '10';
    }
  }

  /**
   * Apply selected effect to piece
   * @param {HTMLElement} piece - Piece element
   * @param {boolean} isSelected - Is piece selected
   */
  setSelectedEffect(piece, isSelected) {
    if (isSelected) {
      piece.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.8), 0 0 40px rgba(0, 255, 255, 0.4), inset 0 0 10px rgba(255, 255, 255, 0.2)';
      piece.style.animation = 'piece-pulse 1s ease-in-out infinite';
      piece.style.transform = 'scale(1.1)';
    } else {
      piece.style.animation = 'none';
      piece.style.boxShadow = '';
      piece.style.transform = 'scale(1)';
    }
  }

  /**
   * Apply movable highlight effect
   * @param {HTMLElement} piece - Piece element
   * @param {boolean} isMovable - Is piece movable
   */
  setMovableEffect(piece, isMovable) {
    if (isMovable) {
      piece.style.boxShadow = '0 0 15px rgba(255, 200, 0, 0.7), 0 0 30px rgba(255, 200, 0, 0.3), 0 3px 6px rgba(0, 0, 0, 0.4)';
      piece.style.cursor = 'pointer';
    } else {
      piece.style.cursor = 'default';
      piece.style.boxShadow = '';
    }
  }

  /**
   * Animate piece capture (moving back to home)
   * @param {HTMLElement} piece - Piece element
   * @param {Array} path - Array of [row, col] positions to animate through
   * @param {Function} onComplete - Callback when animation completes
   */
  animateCapture(piece, path, onComplete) {
    let pathIndex = path.length - 1;
    
    const animateStep = () => {
      if (pathIndex < 0) {
        if (onComplete) onComplete();
        return;
      }
      
      const [row, col] = path[pathIndex];
      piece.style.transition = 'all 0.15s linear';
      this.updatePiecePosition(piece, row, col, false);
      
      pathIndex--;
      setTimeout(animateStep, 150);
    };
    
    animateStep();
  }

  /**
   * Animate piece entering from home
   * @param {HTMLElement} piece - Piece element
   * @param {Array} startPos - Start position [row, col]
   * @param {Array} endPos - End position [row, col]
   */
  animateEntry(piece, startPos, endPos) {
    piece.style.transition = 'none';
    this.updatePiecePosition(piece, startPos[0], startPos[1], false);
    piece.style.opacity = '0.5';
    piece.style.transform = 'scale(0.5)';
    
    // Animate entry with bounce
    setTimeout(() => {
      piece.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
      this.updatePiecePosition(piece, endPos[0], endPos[1], false);
      piece.style.opacity = '1';
      piece.style.transform = 'scale(1)';
    }, 50);
  }

  /**
   * Show invalid move feedback (shake effect)
   * @param {HTMLElement} piece - Piece element
   */
  shakeInvalid(piece) {
    piece.style.animation = 'piece-shake 0.4s ease-in-out';
    
    setTimeout(() => {
      piece.style.animation = 'none';
    }, 400);
  }

  /**
   * Helper: Lighten a color
   * @param {string} color - Hex color
   * @param {number} percent - Percent to lighten
   */
  lightenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return '#' + (0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1);
  }

  /**
   * Helper: Darken a color
   * @param {string} color - Hex color
   * @param {number} percent - Percent to darken
   */
  darkenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return '#' + (0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1);
  }

  /**
   * Clear all pieces from board
   */
  clearAllPieces() {
    Object.values(this.pieceElements).forEach(piece => {
      if (piece && piece.parentNode) {
        piece.parentNode.removeChild(piece);
      }
    });
    this.pieceElements = {};
  }

  /**
   * Get piece element by ID
   * @param {string} pieceId - Piece ID (color-index)
   */
  getPiece(pieceId) {
    return this.pieceElements[pieceId];
  }
}

export default PieceRenderer;
