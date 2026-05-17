import App from '../main.js';
import { connect, createSession, joinSession } from '../services/socket.js';
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
        <div class="landing-name-input">
          <label for="landing-name">Your name</label>
          <input type="text" id="landing-name" class="input" placeholder="Enter your name" maxlength="20" value="${App.state.userName || ''}">
        </div>
        <button class="landing-btn landing-btn-primary" id="btn-create-session">
          Start a Session
        </button>
        <div class="landing-divider">or</div>
        <div class="landing-join-section">
          <input type="text" id="landing-code" class="input input-mono" placeholder="XXXX" maxlength="4" autocomplete="off">
          <button class="landing-btn btn-secondary" id="btn-join-session">
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

  document.getElementById('btn-create-session').addEventListener('click', handleCreate);
  document.getElementById('btn-join-session').addEventListener('click', handleJoin);
}

async function handleCreate() {
  const userName = document.getElementById('landing-name').value.trim() || 'Host';
  App.state.userName = userName;

  const btn = document.getElementById('btn-create-session');
  btn.textContent = 'Creating...';
  btn.disabled = true;

  connect();

  const result = await createSession(userName);

  if (result.error) {
    showNotification('error', result.error);
    btn.textContent = 'Start a Session';
    btn.disabled = false;
    return;
  }

  App.navigateToSession({
    code: result.code,
    userId: result.hostId,
    hostId: result.hostId,
    isHost: true,
    userName,
    users: result.users || [{ id: result.hostId, name: userName, isHost: true }],
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
  });
}

export { render as renderLanding };
