const BUBBLE_COLORS = [
  '#8b5cf6', '#06b6d4', '#f43f5e', '#22c55e',
  '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6',
  '#a855f7', '#f97316', '#06b6d4', '#84cc16',
];

const DEFAULT_USER_AVATARS = ['🐱', '🐶', '🐰', '🦊', '🐸', '🐵', '🦁', '🐯', '🐮', '🐷', '🐻', '🐼'];

export function renderUserBubbles(users, state) {
  const headerContainer = document.getElementById('session-header-container');
  if (!headerContainer) return;

  const right = headerContainer.querySelector('.session-header-right');
  if (!right) return;

  const existingBubbles = right.querySelector('.user-bubbles');
  if (existingBubbles) existingBubbles.remove();

  const bubbles = document.createElement('div');
  bubbles.className = 'user-bubbles';

  const maxVisible = 5;
  const visible = users.slice(0, maxVisible);
  const remainder = users.length - maxVisible;

  visible.forEach((user, index) => {
    const bubble = document.createElement('div');
    bubble.className = 'user-bubble';
    const colorIndex = index % BUBBLE_COLORS.length;
    const bgColor = BUBBLE_COLORS[colorIndex];
    bubble.style.background = `${bgColor}33`;
    bubble.style.color = bgColor;
    bubble.style.border = `1px solid ${bgColor}44`;

    const initial = user.name ? user.name.charAt(0).toUpperCase() : '?';
    bubble.textContent = initial;

    bubble.title = user.name;
    if (user.isHost) bubble.title += ' (Host)';

    if (user.isHost) {
      const crown = document.createElement('span');
      crown.className = 'user-bubble-crown';
      crown.textContent = '👑';
      bubble.appendChild(crown);
    }

    bubbles.appendChild(bubble);
  });

  if (remainder > 0) {
    const more = document.createElement('div');
    more.className = 'user-bubble-more';
    more.textContent = `+${remainder}`;
    more.title = `${remainder} more users`;
    bubbles.appendChild(more);
  }

  const countEl = right.querySelector('.session-user-count');
  if (countEl) {
    countEl.innerHTML = `
      <span class="session-user-count-dot"></span>
      <span>${users.length}</span>
    `;
  }

  right.insertBefore(bubbles, right.querySelector('.session-user-count'));
}

export function updateUserBubbles(users, state) {
  renderUserBubbles(users, state);
}
