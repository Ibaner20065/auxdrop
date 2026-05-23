import { disconnect, getSocket } from '../services/socket.js';
import App from '../main.js';

export function renderSessionHeader(state) {
  const container = document.getElementById('session-header-container');
  if (!container) return;

  container.innerHTML = `
    <header class="session-header animate-fadeInUp">
      <div style="display:flex; align-items:center; gap:16px;">
        <span class="logo-small">AUXDROP</span>
        <div class="room-badge" id="session-code-display" title="Click to copy" style="cursor:pointer;">
          <span class="session-code-text">ROOM: ${state.code}</span>
        </div>
      </div>
      
      <div style="display:flex; align-items:center; gap:16px;">
        <div class="user-bubbles"></div>
        <div style="font-family:var(--font-mono); font-weight:bold; color:var(--neon-cyan); display:flex; align-items:center; gap:8px;">
           <div class="pulse-dot"></div>
           ${state.users?.length || 1} ONLINE
        </div>
        <button class="btn" id="btn-qr" title="Show QR code" style="padding: 8px 12px; border-width: 2px;">
          QR
        </button>
        <button class="btn" id="btn-leave" style="padding: 8px 16px; border-width: 2px; border-color:var(--neon-pink); color:var(--neon-pink);">
          EXIT
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
        text.textContent = 'COPIED!';
        setTimeout(() => { text.textContent = original; }, 1500);
      }
    });
  });

  document.getElementById('btn-qr')?.addEventListener('click', () => {
    openQRModal(state.code);
  });

  document.getElementById('btn-leave')?.addEventListener('click', () => {
    const sock = getSocket();
    if (sock?.connected) {
      sock.emit('leave_session', {}, () => {
        disconnect();
        App.leaveSession();
      });
      setTimeout(() => {
        if (App.currentView === 'session') {
          disconnect();
          App.leaveSession();
        }
      }, 1500);
    } else {
      disconnect();
      App.leaveSession();
    }
  });
}

function openQRModal(code) {
  const overlay = document.getElementById('qr-modal-overlay');
  const modal = document.getElementById('qr-modal');
  overlay.classList.remove('hidden');

  const sessionUrl = \`\${window.location.origin}?join=\${code}\`;

  modal.innerHTML = `
    <div class="modal-header">
      <h2>SHARE CONNECTION LINK</h2>
      <button class="btn" id="qr-modal-close" style="padding:4px 8px; border-width:2px; font-size:0.8rem;">✕</button>
    </div>
    <div style="padding:24px; text-align:center;">
      <h1 class="display" style="font-size:3rem; margin-bottom:16px; letter-spacing:4px; color:var(--neon-cyan);">${code}</h1>
      <div id="qr-code-container" style="background:#FFF; padding:16px; display:inline-block; margin-bottom:24px; border:var(--brutal-border); box-shadow:var(--brutal-shadow);">
        <canvas id="qr-canvas"></canvas>
      </div>
      <button class="btn btn-primary" id="btn-copy-url" style="width:100%;">
        COPY INVITE LINK
      </button>
    </div>
  `;

  setTimeout(() => overlay.classList.add('active'), 10);

  try {
    import('qrcode').then((QRCode) => {
      const canvas = document.getElementById('qr-canvas');
      if (canvas) {
        QRCode.toCanvas(canvas, sessionUrl, { width: 250, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
      }
    });
  } catch (e) {
    console.warn('QR generation unavailable');
  }

  document.getElementById('qr-modal-close').addEventListener('click', () => {
    overlay.classList.remove('active');
    setTimeout(() => overlay.classList.add('hidden'), 300);
  });

  document.getElementById('btn-copy-url')?.addEventListener('click', () => {
    navigator.clipboard.writeText(sessionUrl).then(() => {
      const btn = document.getElementById('btn-copy-url');
      if (btn) {
        btn.textContent = 'COPIED!';
        setTimeout(() => { btn.textContent = 'COPY INVITE LINK'; }, 1500);
      }
    });
  });
}
