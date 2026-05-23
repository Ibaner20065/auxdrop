import App from '../main.js';
import { createSession, joinSession, storeSession } from '../services/socket.js';
import { showNotification } from '../components/notifications.js';

const LANDING_SELECTOR = '#view-landing';

export function render() {
  const container = document.querySelector(LANDING_SELECTOR);
  container.className = 'view active landing';

  container.innerHTML = `
    <div class="landing-bg">
      <div class="landing-grid-overlay"></div>
    </div>
    <div class="landing-container animate-fadeInUp">
      <h1 class="hero-title">AUXDROP</h1>
      <p class="hero-subtitle">THE DEMOCRATIC AUX CORD</p>
      
      <div class="entry-card">
        <div style="margin-bottom: 24px;">
          <label class="mono" style="display:block; margin-bottom: 8px; color: var(--neon-cyan);">// CALLSIGN</label>
          <input type="text" id="landing-name" class="input" placeholder="ENTER YOUR ALIAS" maxlength="20" value="${App.state.userName || ''}">
        </div>
        
        <div style="margin-bottom: 32px;">
          <label class="mono" style="display:block; margin-bottom: 8px; color: var(--neon-cyan);">// EXPERIENCE</label>
          <select id="landing-type" class="input" style="appearance: none;">
            <option value="music">LIVE MUSIC QUEUE</option>
            <option value="snakes">SNAKES & LADDERS</option>
            <option value="ludo">MULTIPLAYER LUDO</option>
          </select>
        </div>
        
        <button class="btn btn-primary" id="btn-create-session" style="width: 100%; margin-bottom: 24px;">
          INITIALIZE PARTY_
        </button>
        
        <div style="text-align: center; margin-bottom: 24px; position: relative;">
          <div style="position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: rgba(255,255,255,0.1); z-index: 1;"></div>
          <span class="mono" style="background: var(--bg-surface); padding: 0 12px; position: relative; z-index: 2; color: var(--text-muted); font-size: 0.8rem;">OR JOIN EXISTING</span>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <input type="text" id="landing-code" class="input input-mono" placeholder="XXXX" maxlength="4" autocomplete="off">
          <button class="btn" id="btn-join-session" style="width: 100%;">
            ENTER ROOM
          </button>
        </div>
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

  document.getElementById('btn-create-session').addEventListener('click', (e) => {
    const type = document.getElementById('landing-type').value;
    handleCreate(type, e.target);
  });

  document.getElementById('btn-join-session').addEventListener('click', handleJoin);
}

async function handleCreate(initialTab, buttonElement) {
  const userName = document.getElementById('landing-name').value.trim() || 'HOST';
  App.state.userName = userName;

  const originalText = buttonElement.textContent;
  buttonElement.textContent = 'CONNECTING...';
  buttonElement.disabled = true;

  const result = await createSession(userName, initialTab);

  if (result.error || !result.success) {
    showNotification('error', result.error || 'Failed to initialize');
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
    showNotification('error', 'INVALID ROOM CODE');
    return;
  }

  const userName = document.getElementById('landing-name').value.trim() || 'GUEST';
  App.state.userName = userName;

  const btn = document.getElementById('btn-join-session');
  btn.textContent = 'CONNECTING...';
  btn.disabled = true;

  const result = await joinSession(code, userName);

  if (result.error || !result.success) {
    showNotification('error', result.error || 'Connection Failed');
    btn.textContent = 'ENTER ROOM';
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
