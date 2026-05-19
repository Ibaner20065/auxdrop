/**
 * Animation Engine
 * Handles smooth animations, transitions, and timing utilities
 */

class AnimationEngine {
  constructor() {
    this.activeAnimations = new Map();
    this.requestAnimationFrameId = null;
  }

  /**
   * Easing functions for smooth animation
   */
  static easing = {
    linear: (t) => t,
    easeIn: (t) => t * t,
    easeOut: (t) => 1 - (1 - t) * (1 - t),
    easeInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeOutBounce: (t) => {
      const n1 = 7.5625;
      const d1 = 2.75;
      if (t < 1 / d1) {
        return n1 * t * t;
      } else if (t < 2 / d1) {
        return n1 * (t -= 1.5 / d1) * t + 0.75;
      } else if (t < 2.5 / d1) {
        return n1 * (t -= 2.25 / d1) * t + 0.9375;
      } else {
        return n1 * (t -= 2.625 / d1) * t + 0.984375;
      }
    },
    easeInQuad: (t) => t * t,
    easeOutQuad: (t) => t * (2 - t),
    easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeInCubic: (t) => t * t * t,
    easeOutCubic: (t) => (--t) * t * t + 1,
    easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * (t - 2)) * (2 * (t - 2)) + 1
  };

  /**
   * Animate element position smoothly
   * @param {HTMLElement} element - Element to animate
   * @param {Object} options - Animation options
   */
  animatePosition(element, options) {
    const {
      fromX = 0,
      fromY = 0,
      toX = 0,
      toY = 0,
      duration = 400,
      easing: easingFunc = 'easeOut',
      onUpdate = null,
      onComplete = null
    } = options;

    const easingFunction = typeof easingFunc === 'string' 
      ? AnimationEngine.easing[easingFunc] 
      : easingFunc;

    const startTime = performance.now();
    const animationId = Math.random();
    this.activeAnimations.set(animationId, true);

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = easingFunction(progress);

      const currentX = fromX + (toX - fromX) * easeProgress;
      const currentY = fromY + (toY - fromY) * easeProgress;

      element.style.transform = `translate(${currentX}px, ${currentY}px)`;

      if (onUpdate) {
        onUpdate({ x: currentX, y: currentY, progress });
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        element.style.transform = `translate(${toX}px, ${toY}px)`;
        this.activeAnimations.delete(animationId);
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animate);
    return animationId;
  }

  /**
   * Animate numeric value (for counters, opacity, etc)
   * @param {Object} options - Animation options
   */
  animateValue(options) {
    const {
      from = 0,
      to = 100,
      duration = 400,
      easing: easingFunc = 'easeOut',
      onUpdate = null,
      onComplete = null
    } = options;

    const easingFunction = typeof easingFunc === 'string'
      ? AnimationEngine.easing[easingFunc]
      : easingFunc;

    const startTime = performance.now();
    const animationId = Math.random();
    this.activeAnimations.set(animationId, true);

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = easingFunction(progress);

      const currentValue = from + (to - from) * easeProgress;

      if (onUpdate) {
        onUpdate(currentValue);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        if (onUpdate) onUpdate(to);
        this.activeAnimations.delete(animationId);
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animate);
    return animationId;
  }

  /**
   * Delay execution
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a sequence of animations
   * @param {Array} animations - Array of animation functions that return promises
   */
  async sequence(animations) {
    for (const animation of animations) {
      await animation();
    }
  }

  /**
   * Create parallel animations
   * @param {Array} animations - Array of animation functions that return promises
   */
  async parallel(animations) {
    return Promise.all(animations.map(animation => animation()));
  }

  /**
   * Cancel specific animation
   * @param {string|number} animationId - Animation ID to cancel
   */
  cancelAnimation(animationId) {
    this.activeAnimations.delete(animationId);
  }

  /**
   * Cancel all active animations
   */
  cancelAll() {
    this.activeAnimations.clear();
  }

  /**
   * Get number of active animations
   */
  getActiveCount() {
    return this.activeAnimations.size;
  }
}

export default AnimationEngine;
