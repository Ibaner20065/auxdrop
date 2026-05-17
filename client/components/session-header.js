import { disconnect } from '../services/socket.js';
import App from '../main.js';

export function renderSessionHeader(state) {
  const container = document.getElementById('session-header-container');
  if (!container) return;

  container.innerHTML = `
    <header class="session-header">
      <div class="session-header-left">
        <span class="session-header-logo">AuxDrop</span>
        <div class="session-code-display" id="session-code-display" title="Click to copy">
          <span class="session-code-text">${state.code}</span>
        </div>
        <div id="connection-status" class="connection-status connected">Connected</div>
      </div>
      <div class="session-header-right">
        <div class="user-bubbles"></div>
        <div class="session-user-count">
          <span class="session-user-count-dot"></span>
          <span>${state.users?.length || 1}</span>
        </div>
        <button class="btn-icon" id="btn-qr" title="Show QR code">
          ◈
        </button>
        <button class="btn-ghost" id="btn-leave" style="color:var(--accent-hot);font-size:0.8rem;">
          Leave
        </button>
      </div>
    </header>
  `;

  attachHeaderEvents(state);
}

function attachHeaderEvents(state) {
  const codeDisplay = document.getElementById('session-code-display');
  codeDisplay?.addEventListener('click', () => {
    navigator.clipboard.writeText(state.code).then(() => {
      const text = codeDisplay.querySelector('.session-code-text');
      if (text) {
        const original = text.textContent;
        text.textContent = 'Copied!';
        setTimeout(() => { text.textContent = original; }, 1500);
      }
    });
  });

  document.getElementById('btn-qr')?.addEventListener('click', () => {
    openQRModal(state.code);
  });

  document.getElementById('btn-leave')?.addEventListener('click', () => {
    disconnect();
    App.leaveSession();
  });
}

function openQRModal(code) {
  const overlay = document.getElementById('qr-modal-overlay');
  const modal = document.getElementById('qr-modal');
  overlay.classList.remove('hidden');

  const sessionUrl = `${window.location.origin}?join=${code}`;

  modal.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">Share Session</h2>
      <button class="modal-close" id="qr-modal-close">✕</button>
    </div>
    <div class="qr-modal-content">
      <div class="qr-modal-code">${code}</div>
      <div id="qr-code-container">
        <canvas id="qr-canvas"></canvas>
      </div>
      <p class="qr-modal-hint">Share this code or URL with friends to join</p>
      <button class="btn btn-primary" id="btn-copy-url" style="width:100%;">
        Copy Session URL
      </button>
    </div>
  `;

  setTimeout(() => overlay.classList.add('active'), 10);

  try {
    import('qrcode').then((QRCode) => {
      const canvas = document.getElementById('qr-canvas');
      if (canvas) {
        QRCode.toCanvas(canvas, sessionUrl, { width: 200, margin: 2, color: { dark: '#000', light: '#fff' } });
      }
    });
  } catch (e) {
    console.warn('QR generation unavailable');
  }

  document.getElementById('qr-modal-close').addEventListener('click', () => {
    overlay.classList.remove('active');
    setTimeout(() => overlay.classList.add('hidden'), 300);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('active');
      setTimeout(() => overlay.classList.add('hidden'), 300);
    }
  });

  document.getElementById('btn-copy-url')?.addEventListener('click', () => {
    navigator.clipboard.writeText(sessionUrl).then(() => {
      const btn = document.getElementById('btn-copy-url');
      if (btn) {
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy Session URL'; }, 1500);
      }
    });
  });
}
