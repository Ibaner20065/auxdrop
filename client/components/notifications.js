const CONTAINER_ID = 'notification-container';
const NOTIFICATION_DURATION = 3500;

const ICONS = {
  join: '👋',
  vote: '🗳️',
  skip: '🪦',
  crown: '👑',
  error: '⚠️',
  info: '💡',
  vibe: '😈',
};

const THEMES = {
  join: 'notification-join',
  vote: 'notification-vote',
  skip: 'notification-skip',
  crown: 'notification-crown',
  error: '',
  info: '',
  vibe: 'notification-skip',
};

export function showNotification(type, message) {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  const icon = ICONS[type] || '💬';
  const themeClass = THEMES[type] || '';

  const el = document.createElement('div');
  el.className = `notification ${themeClass}`;
  el.innerHTML = `
    <span class="notification-icon">${icon}</span>
    <span class="notification-content">${message}</span>
    <span class="notification-dismiss">✕</span>
  `;

  const dismiss = el.querySelector('.notification-dismiss');
  dismiss.addEventListener('click', () => removeNotification(el));

  container.appendChild(el);

  setTimeout(() => {
    removeNotification(el);
  }, NOTIFICATION_DURATION);
}

function removeNotification(el) {
  if (el.classList.contains('removing')) return;
  el.classList.add('removing');
  setTimeout(() => {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 300);
}
