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
    // Handle Spotify OAuth popup return — if we're in a popup with an access_token
    // hash, send it to the opener and close this window immediately.
    if (window.opener) {
      const hash = new URLSearchParams(window.location.hash.substring(1));
      const token = hash.get('access_token');
      if (token) {
        window.opener.postMessage({ type: 'SPOTIFY_TOKEN', token }, window.location.origin);
        window.close();
        return;
      }
    }

    this.showView('landing');
    window.__auxdrop = this;
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
});

export default App;
