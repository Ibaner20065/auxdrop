import { render as renderLanding } from './views/landing.js';
import { render as renderSession } from './views/session.js';

const App = {
  currentView: 'landing',
  state: {
    code: null,
    userId: null,
    hostId: null,
    isHost: false,
    userName: null,
    users: [],
    queue: [],
    nowPlaying: null,
    playerReady: false,
  },

  init() {
    this.showView('landing');
    window.__auxdrop = this;
    
    // Mobile Detection
    this.checkMobile();
    window.addEventListener('resize', () => this.checkMobile());
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
    this.state = {
      code: null,
      userId: null,
      hostId: null,
      isHost: false,
      userName: null,
      users: [],
      queue: [],
      nowPlaying: null,
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
