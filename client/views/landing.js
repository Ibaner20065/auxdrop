import App from '../main.js';
import { createSession, joinSession, storeSession } from '../services/socket.js';
import { showNotification } from '../components/notifications.js';

const LANDING_SELECTOR = '#view-landing';

export function render() {
  const container = document.querySelector(LANDING_SELECTOR);
  container.className = 'view active landing';

  container.innerHTML = `
    <div class="landing-bg" id="landing-bg"></div>
    <div class="landing-content animate-fadeInUp">
      <h1 class="landing-logo">AuxDrop</h1>
      <p class="landing-tagline">
        The Democratic Aux Cord.<br>
        Everyone votes. No bad vibes.
      </p>
      <div class="landing-actions">
        <div class="landing-name-input" style="text-align: left;">
          <label for="landing-name" style="display:block; margin-bottom: 4px;">Your name</label>
          <input type="text" id="landing-name" class="input" placeholder="Enter your name" maxlength="20" value="${App.state.userName || ''}">
        </div>
        <div class="landing-name-input" style="margin-top: 8px; margin-bottom: 16px; text-align: left;">
          <label for="landing-type" style="display:block; margin-bottom: 4px;">Party Type</label>
          <select id="landing-type" class="input" style="margin-bottom: 0;">
            <option value="music">Music</option>
            <option value="snakes">Snakes & Ladders</option>
            <option value="ludo">Ludo</option>
          </select>
        </div>
        <button class="landing-btn landing-btn-primary" id="btn-create-session" style="width: 100%;">
          Start a Session
        </button>
        <div class="landing-divider">or</div>
        <div class="landing-join-section">
          <input type="text" id="landing-code" class="input input-mono" placeholder="XXXX" maxlength="4" autocomplete="off">
          <button class="landing-btn btn-secondary" id="btn-join-session" style="width: 100%;">
            Join Session
          </button>
        </div>
      </div>
    </div>
  `;

  createParticles();
  attachEvents();
}

function createParticles() {
  const bg = document.getElementById('landing-bg');
  if (!bg) return;
  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    particle.className = 'landing-particle';
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random() * 6}s`;
    particle.style.animationDuration = `${4 + Math.random() * 4}s`;
    particle.style.width = `${2 + Math.random() * 3}px`;
    particle.style.height = particle.style.width;
    bg.appendChild(particle);
  }
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

  document.getElementById('btn-create-session').addEventListener('click', (e) => {
    const type = document.getElementById('landing-type').value;
    handleCreate(type, e.target);
  });

  document.getElementById('btn-join-session').addEventListener('click', handleJoin);
}

async function handleCreate(initialTab, buttonElement) {
  const userName = document.getElementById('landing-name').value.trim() || 'Host';
  App.state.userName = userName;

  const originalText = buttonElement.textContent;
  buttonElement.textContent = 'Creating...';
  buttonElement.disabled = true;

  const result = await createSession(userName, initialTab);

  if (result.error || !result.success) {
    showNotification('error', result.error || 'Failed to create session');
    buttonElement.textContent = originalText;
    buttonElement.disabled = false;
    return;
  }

  storeSession(result.code, result.hostId);

  App.navigateToSession({
    code: result.code,
    userId: result.hostId,
    hostId: result.hostId,
    isHost: true,
    userName,
    users: result.users || [{ id: result.hostId, name: userName, isHost: true }],
    nowPlaying: result.nowPlaying || null,
    playStartedAt: result.playStartedAt || null,
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

  const result = await joinSession(code, userName);

  if (result.error || !result.success) {
    showNotification('error', result.error || 'Failed to join session');
    btn.textContent = 'Join Session';
    btn.disabled = false;
    return;
  }

  storeSession(result.code, result.userId);

  App.navigateToSession({
    code: result.code,
    userId: result.userId,
    hostId: result.hostId,
    isHost: result.isHost,
    userName,
    users: result.users || [],
    nowPlaying: result.nowPlaying || null,
    playStartedAt: result.playStartedAt || null,
    currentPosition: result.currentPosition || null,
    queue: result.queue || null,
    initialTab: result.partyType,
  });
}

export { render as renderLanding };
