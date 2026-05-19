/**
 * Dice Rendering and Animation System
 * Handles 3D-style dice visualization with spinning animation and physics
 */

class DiceRenderer {
  constructor() {
    this.isRolling = false;
    this.currentValue = null;
    this.diceElement = null;
    this.soundEnabled = true;
  }

  /**
   * Create dice element with 3D styling
   */
  createDiceElement() {
    const container = document.createElement('div');
    container.className = 'dice-container';
    container.innerHTML = `
      <div class="dice-3d-wrapper">
        <div class="dice-3d" id="dice-3d-element">
          <div class="dice-face dice-face-1">1</div>
          <div class="dice-face dice-face-2">2</div>
          <div class="dice-face dice-face-3">3</div>
          <div class="dice-face dice-face-4">4</div>
          <div class="dice-face dice-face-5">5</div>
          <div class="dice-face dice-face-6">6</div>
        </div>
      </div>
      <div class="dice-display" id="dice-display">🎲</div>
      <div class="dice-glow" id="dice-glow"></div>
    `;
    this.diceElement = container;
    return container;
  }

  /**
   * Animate dice rolling with spinning effect
   * @param {Function} onComplete - Callback when roll animation completes
   */
  async rollDice(onComplete) {
    if (this.isRolling) return;
    
    this.isRolling = true;
    const diceEl = document.getElementById('dice-3d-element');
    const displayEl = document.getElementById('dice-display');
    const glowEl = document.getElementById('dice-glow');
    
    if (!diceEl || !displayEl) {
      this.isRolling = false;
      return;
    }

    // Reset and prepare for animation
    diceEl.style.transition = 'none';
    diceEl.style.transform = 'rotateX(0) rotateY(0) rotateZ(0)';
    displayEl.textContent = '🎲';
    displayEl.style.animation = 'none';
    
    // Add glow effect
    if (glowEl) {
      glowEl.style.animation = 'dice-glow-pulse 0.8s ease-in-out infinite';
    }

    // Rapid random number display during rolling
    let rollDuration = 0;
    const rollInterval = setInterval(() => {
      const randomValue = Math.floor(Math.random() * 6) + 1;
      displayEl.textContent = randomValue;
      
      // Rotate dice based on random value
      this.rotateDiceToValue(diceEl, randomValue);
      
      rollDuration += 50;
      if (rollDuration >= 1200) { // Roll for 1.2 seconds
        clearInterval(rollInterval);
        this.completeRoll(diceEl, displayEl, glowEl, onComplete);
      }
    }, 50);

    // Also apply rotating transform during roll
    diceEl.style.transition = 'transform 0.05s linear';
    this.animateDiceRotation(diceEl);
  }

  /**
   * Rotate dice element to show specific value
   */
  rotateDiceToValue(diceEl, value) {
    const rotations = {
      1: 'rotateX(0deg) rotateY(0deg)',
      2: 'rotateX(0deg) rotateY(-90deg)',
      3: 'rotateX(0deg) rotateY(90deg)',
      4: 'rotateX(0deg) rotateY(180deg)',
      5: 'rotateX(-90deg) rotateY(0deg)',
      6: 'rotateX(90deg) rotateY(0deg)'
    };
    diceEl.style.transform = rotations[value] || 'rotateX(0deg) rotateY(0deg)';
  }

  /**
   * Animate dice rotation during rolling
   */
  animateDiceRotation(diceEl) {
    let rotation = 0;
    const rotationInterval = setInterval(() => {
      rotation += 45;
      diceEl.style.transform = `rotateX(${rotation * 2}deg) rotateY(${rotation}deg) rotateZ(${rotation}deg)`;
      
      if (rotation >= 1080) { // Stop after 3 full rotations
        clearInterval(rotationInterval);
      }
    }, 30);
  }

  /**
   * Complete the roll animation and show final value
   */
  completeRoll(diceEl, displayEl, glowEl, onComplete) {
    const finalValue = Math.floor(Math.random() * 6) + 1;
    this.currentValue = finalValue;

    // Stop glow animation
    if (glowEl) {
      glowEl.style.animation = 'none';
      glowEl.style.opacity = '0';
    }

    // Set final rotation with smooth transition
    diceEl.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
    this.rotateDiceToValue(diceEl, finalValue);

    // Display final value with bounce
    displayEl.textContent = finalValue;
    displayEl.style.animation = 'dice-bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';

    // Play sound if enabled
    if (this.soundEnabled) {
      this.playDiceSound();
    }

    // Complete animation
    setTimeout(() => {
      this.isRolling = false;
      if (onComplete) {
        onComplete(finalValue);
      }
    }, 600);
  }

  /**
   * Play dice roll sound effect
   */
  playDiceSound() {
    // Create simple click sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Quick burst sound
      oscillator.frequency.value = 1000;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      // Audio not available, continue silently
    }
  }

  /**
   * Set dice value without animation (for display purposes)
   */
  setDiceValue(value) {
    this.currentValue = value;
    const displayEl = document.getElementById('dice-display');
    const diceEl = document.getElementById('dice-3d-element');
    
    if (displayEl) {
      displayEl.textContent = value;
      displayEl.style.animation = 'none';
    }
    
    if (diceEl) {
      diceEl.style.transition = 'transform 0.3s ease-out';
      this.rotateDiceToValue(diceEl, value);
    }
  }

  /**
   * Reset dice to initial state
   */
  reset() {
    this.isRolling = false;
    this.currentValue = null;
    
    const diceEl = document.getElementById('dice-3d-element');
    const displayEl = document.getElementById('dice-display');
    const glowEl = document.getElementById('dice-glow');
    
    if (diceEl) {
      diceEl.style.transition = 'transform 0.3s ease-out';
      diceEl.style.transform = 'rotateX(0deg) rotateY(0deg)';
    }
    
    if (displayEl) {
      displayEl.textContent = '🎲';
      displayEl.style.animation = 'none';
    }
    
    if (glowEl) {
      glowEl.style.animation = 'none';
      glowEl.style.opacity = '0';
    }
  }

  /**
   * Check if currently rolling
   */
  isCurrentlyRolling() {
    return this.isRolling;
  }

  /**
   * Get current displayed value
   */
  getCurrentValue() {
    return this.currentValue;
  }
}

export default DiceRenderer;
