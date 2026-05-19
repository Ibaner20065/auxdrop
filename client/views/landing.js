import App from '../main.js';
import { connect, createSession, joinSession } from '../services/socket.js';
import { showNotification } from '../components/notifications.js';

const LANDING_SELECTOR = '#view-landing';

export function render() {
  const container = document.querySelector(LANDING_SELECTOR);
  container.className = 'view active landing';

  container.innerHTML = `
    <div class="landing-bg" id="landing-bg"></div>
    <div class="landing-content animate-fadeInUp" style="max-width: 1000px; width: 95%;">
      <h1 class="landing-logo">AuxDrop Parties</h1>
      <p class="landing-tagline">
        One Party Code. Multiple Experiences.<br>
        Listen to music, play Ludo, or climb Snakes & Ladders together!
      </p>
      
      <div class="landing-name-input" style="max-width: 300px; margin: 0 auto 2rem auto;">
        <label for="landing-name">Your Name</label>
        <input type="text" id="landing-name" class="input" placeholder="Enter your name" maxlength="20" value="${App.state.userName || ''}">
      </div>

      <div class="landing-cards-container" style="display: flex; gap: 20px; flex-wrap: wrap; justify-content: center; margin-bottom: 2rem;">
        
        <!-- Left: Snakes & Ladders -->
        <div class="landing-card" style="flex: 1; min-width: 250px; background: var(--bg-primary); border: var(--border-outset); border-color: var(--color-outset); padding: 1rem; text-align: center;">
          <h2 style="margin-top: 0;">🐍 S&L</h2>
          <p style="font-size: 0.9rem; margin-bottom: 1rem;">Classic Snakes & Ladders board game party.</p>
          <button class="landing-btn landing-btn-primary btn-start-party" data-tab="snakes" style="width: 100%; font-size: 0.9rem;">Start S&L Party</button>
        </div>

        <!-- Middle: Music (AuxDrop) -->
        <div class="landing-card" style="flex: 1; min-width: 250px; background: var(--bg-primary); border: var(--border-outset); border-color: var(--color-outset); padding: 1rem; text-align: center; transform: scale(1.05); z-index: 2; box-shadow: 4px 4px 0 #000;">
          <h2 style="margin-top: 0;">🎵 Music</h2>
          <p style="font-size: 0.9rem; margin-bottom: 1rem;">The Democratic Aux Cord. Vote on songs!</p>
          <button class="landing-btn landing-btn-primary btn-start-party" data-tab="music" style="width: 100%; font-size: 0.9rem;">Start Music Party</button>
        </div>

        <!-- Right: Ludo -->
        <div class="landing-card" style="flex: 1; min-width: 250px; background: var(--bg-primary); border: var(--border-outset); border-color: var(--color-outset); padding: 1rem; text-align: center;">
          <h2 style="margin-top: 0;">🎲 Ludo</h2>
          <p style="font-size: 0.9rem; margin-bottom: 1rem;">Roll the dice and race your tokens home.</p>
          <button class="landing-btn landing-btn-primary btn-start-party" data-tab="ludo" style="width: 100%; font-size: 0.9rem;">Start Ludo Party</button>
        </div>

      </div>

      <div class="landing-divider">or</div>
      <div class="landing-join-section" style="max-width: 400px; margin: 0 auto;">
        <input type="text" id="landing-code" class="input input-mono" placeholder="PARTY CODE (e.g. A1B2)" maxlength="4" autocomplete="off">
        <button class="landing-btn btn-secondary" id="btn-join-session">
          Join Party
        </button>
      </div>
    </div>
  `;

  attachEvents();
}


function attachEvents() {
  const codeInput = document.getElementById('landing-code');
  const nameInput = document.getElementById('landing-name');

  nameInput.addEventListener('input', () => {
    App.state.userName = nameInput.value.trim();
  });

  codeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleJoin();
  });

  codeInput.addEventListener('input', () => {
    codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });

  const startButtons = document.querySelectorAll('.btn-start-party');
  startButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.target.getAttribute('data-tab');
      handleCreate(tab, e.target);
    });
  });

  document.getElementById('btn-join-session').addEventListener('click', handleJoin);
}

async function handleCreate(initialTab, buttonElement) {
  const userName = document.getElementById('landing-name').value.trim() || 'Host';
  App.state.userName = userName;

  const originalText = buttonElement.textContent;
  buttonElement.textContent = 'Creating...';
  buttonElement.disabled = true;

  connect();

  const result = await createSession(userName, initialTab);

  if (result.error) {
    showNotification('error', result.error);
    buttonElement.textContent = originalText;
    buttonElement.disabled = false;
    return;
  }

  App.navigateToSession({
    code: result.code,
    userId: result.hostId,
    hostId: result.hostId,
    isHost: true,
    userName,
    users: result.users || [{ id: result.hostId, name: userName, isHost: true }],
    initialTab: initialTab
  });
}

async function handleJoin() {
  const code = document.getElementById('landing-code').value.trim().toUpperCase();
  if (!code || code.length < 4) {
    showNotification('error', 'Please enter a valid 4-character code');
    return;
  }

  const userName = document.getElementById('landing-name').value.trim() || 'Guest';
  App.state.userName = userName;

  const btn = document.getElementById('btn-join-session');
  btn.textContent = 'Joining...';
  btn.disabled = true;

  connect();

  const result = await joinSession(code, userName);

  if (result.error) {
    showNotification('error', result.error);
    btn.textContent = 'Join Session';
    btn.disabled = false;
    return;
  }

  App.navigateToSession({
    code: result.code,
    userId: result.userId,
    hostId: result.hostId,
    isHost: result.isHost,
    userName,
    users: result.users || [],
    nowPlaying: result.nowPlaying || null,
    initialTab: result.partyType,
  });
}

export { render as renderLanding };
