/**
 * Sound Manager
 * Handles audio effects for game events
 */

class SoundManager {
  constructor() {
    this.enabled = true;
    this.volume = 0.3;
    this.audioContext = this.initAudioContext();
  }

  /**
   * Initialize Web Audio API context
   */
  initAudioContext() {
    try {
      return new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
      return null;
    }
  }

  /**
   * Play dice roll sound
   */
  playDiceRoll() {
    if (!this.enabled || !this.audioContext) return;
    
    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;
      
      // Create multiple tones for rolling effect
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(800 + i * 200, now + i * 0.05);
        osc.frequency.exponentialRampToValueAtTime(600, now + i * 0.05 + 0.08);
        
        gain.gain.setValueAtTime(this.volume, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.08);
        
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.08);
      }
    } catch (e) {
      console.warn('Error playing dice roll sound:', e);
    }
  }

  /**
   * Play piece move sound
   */
  playPieceMove() {
    if (!this.enabled || !this.audioContext) return;
    
    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.1);
      
      gain.gain.setValueAtTime(this.volume * 0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {
      console.warn('Error playing move sound:', e);
    }
  }

  /**
   * Play piece capture sound
   */
  playCapture() {
    if (!this.enabled || !this.audioContext) return;
    
    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;
      
      // Sharp "hit" sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(1000, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
      
      gain.gain.setValueAtTime(this.volume * 0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      
      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {
      console.warn('Error playing capture sound:', e);
    }
  }

  /**
   * Play victory sound
   */
  playVictory() {
    if (!this.enabled || !this.audioContext) return;
    
    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;
      const notes = [
        { freq: 523.25, time: 0 },      // C5
        { freq: 659.25, time: 0.15 },   // E5
        { freq: 783.99, time: 0.30 }    // G5
      ];
      
      notes.forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.value = note.freq;
        
        gain.gain.setValueAtTime(this.volume, now + note.time);
        gain.gain.exponentialRampToValueAtTime(0.01, now + note.time + 0.3);
        
        osc.start(now + note.time);
        osc.stop(now + note.time + 0.3);
      });
    } catch (e) {
      console.warn('Error playing victory sound:', e);
    }
  }

  /**
   * Play turn notification sound
   */
  playTurnNotification() {
    if (!this.enabled || !this.audioContext) return;
    
    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      
      gain.gain.setValueAtTime(this.volume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      console.warn('Error playing turn notification sound:', e);
    }
  }

  /**
   * Play invalid move sound
   */
  playInvalidMove() {
    if (!this.enabled || !this.audioContext) return;
    
    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
      
      gain.gain.setValueAtTime(this.volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {
      console.warn('Error playing invalid move sound:', e);
    }
  }

  /**
   * Set volume (0-1)
   * @param {number} vol - Volume level
   */
  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  /**
   * Toggle sound on/off
   * @param {boolean} enabled - Enable or disable
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Check if sounds are enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Resume audio context if suspended (required by browser audio policies)
   */
  resumeContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(e => console.warn('Could not resume audio context:', e));
    }
  }
}

export default SoundManager;
