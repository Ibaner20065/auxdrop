let player = null;
let isHost = false;
let currentVideoId = null;
let onEndCallback = null;
let onReadyCallback = null;
let progressInterval = null;
let isMuted = false;
let volume = 100;

export function initPlayer(containerId, onReady, onEnd) {
  onReadyCallback = onReady;
  onEndCallback = onEnd;

  if (typeof YT !== 'undefined' && YT.Player) {
    createPlayer(containerId);
  } else {
    window.onYouTubeIframeAPIReady = () => {
      createPlayer(containerId);
    };
  }
}

function createPlayer(containerId) {
  if (player) {
    player.destroy();
  }

  player = new YT.Player(containerId, {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 0,
      modestbranding: 1,
      rel: 0,
      enablejsapi: 1,
      origin: window.location.origin,
    },
    events: {
      onReady: () => {
        if (onReadyCallback) onReadyCallback();
      },
      onStateChange: onPlayerStateChange,
      onError: (e) => console.error('YouTube player error:', e),
    },
  });
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.ENDED) {
    if (onEndCallback) onEndCallback(currentVideoId);
  }

  if (event.data === YT.PlayerState.PLAYING) {
    startProgressTracking();
  } else {
    stopProgressTracking();
  }

  document.dispatchEvent(new CustomEvent('player-state-change', {
    detail: { state: event.data },
  }));
}

function startProgressTracking() {
  stopProgressTracking();
  progressInterval = setInterval(() => {
    if (player && player.getCurrentTime) {
      const current = player.getCurrentTime();
      const duration = player.getDuration();
      const progress = duration > 0 ? (current / duration) * 100 : 0;
      document.dispatchEvent(new CustomEvent('player-progress', {
        detail: { current, duration, progress },
      }));
    }
  }, 1000);
}

function stopProgressTracking() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

export function loadSong(videoId) {
  if (!player) return;
  currentVideoId = videoId;
  player.loadVideoById(videoId);
}

export function play() {
  if (player) player.playVideo();
}

export function pause() {
  if (player) player.pauseVideo();
}

export function togglePlay() {
  if (!player) return;
  const state = player.getPlayerState();
  if (state === YT.PlayerState.PLAYING) {
    player.pauseVideo();
  } else {
    player.playVideo();
  }
}

export function seekTo(seconds) {
  if (player) player.seekTo(seconds, true);
}

export function setVolume(val) {
  volume = Math.max(0, Math.min(100, val));
  if (player) player.setVolume(volume);
}

export function toggleMute() {
  isMuted = !isMuted;
  if (player) {
    if (isMuted) {
      player.mute();
    } else {
      player.unMute();
      player.setVolume(volume);
    }
  }
  return isMuted;
}

export function getPlayer() {
  return player;
}

export function getCurrentTime() {
  return player ? player.getCurrentTime() : 0;
}

export function getDuration() {
  return player ? player.getDuration() : 0;
}

export function destroy() {
  stopProgressTracking();
  if (player) {
    player.destroy();
    player = null;
  }
  currentVideoId = null;
}
