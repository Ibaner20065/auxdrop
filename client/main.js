import { render as renderLanding } from './views/landing.js';
import { render as renderSession } from './views/session.js';
import { setRejoinHandler, clearStoredSession } from './services/socket.js';

const App = {
  currentView: 'landing',
  state: {
    code: null,
    userId: null,
    hostId: null,
    isHost: false,
    userName: null,
    users: [],
    queue: null,
    nowPlaying: null,
    playStartedAt: null,
    currentPosition: null,
    playerReady: false,
  },

  init() {
    this.showView('landing');
    window.__auxdrop = this;

    setRejoinHandler((payload) => this.handleAutoRejoin(payload));

    // Mobile Detection
    this.checkMobile();
    window.addEventListener('resize', () => this.checkMobile());
  },

  handleAutoRejoin(payload) {
    if (!payload || !payload.success) return;
    console.log('[App] Auto-rejoin received, restoring session', payload.code);
    this.state.code = payload.code;
    this.state.userId = payload.userId;
    this.state.hostId = payload.hostId;
    this.state.isHost = !!payload.isHost;
    this.state.users = payload.users || [];
    this.state.queue = payload.queue || [];
    this.state.nowPlaying = payload.nowPlaying || null;
    this.state.playStartedAt = payload.playStartedAt || null;
    this.state.currentPosition = payload.currentPosition || null;
    this.state.initialTab = payload.partyType;
    this.state.userName = this.state.userName || (payload.users || []).find(u => u.id === payload.userId)?.name || 'Guest';
    this.showView('session');
  },

  checkMobile() {
    if (window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      document.body.classList.add('is-mobile');
    } else {
      document.body.classList.remove('is-mobile');
    }
  },

  showView(viewName) {
    document.querySelectorAll('.view').forEach(v => {
      v.classList.remove('active');
      // Reset any view-specific classes
      v.className = 'view';
    });
    const view = document.getElementById(`view-${viewName}`);
    if (view) view.classList.add('active');
    this.currentView = viewName;

    if (viewName === 'landing') {
      renderLanding();
    } else if (viewName === 'session') {
      renderSession();
    }
  },

  navigateToSession(data) {
    Object.assign(this.state, data);
    this.showView('session');
  },

  leaveSession() {
    clearStoredSession();
    this.state = {
      code: null,
      userId: null,
      hostId: null,
      isHost: false,
      userName: null,
      users: [],
      queue: null,
      nowPlaying: null,
      playStartedAt: null,
      currentPosition: null,
      playerReady: false,
    };
    this.showView('landing');
  },
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    // initialize from local storage
    if (localStorage.getItem('themeOverride') === 'dark') {
      document.body.classList.add('dark-mode');
    } else if (localStorage.getItem('themeOverride') === 'light') {
      document.body.classList.remove('dark-mode');
    }
    
    themeToggle.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark-mode');
      localStorage.setItem('themeOverride', isDark ? 'dark' : 'light');
      themeToggle.textContent = isDark ? '☀️' : '🌙';
    });
    
    // update icon initially
    themeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
  }
});

export default App;
