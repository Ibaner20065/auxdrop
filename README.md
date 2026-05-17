<div align="center">
  <img src="./client/public/logo.png" alt="AuxDrop Logo" width="400" />
  <h1>AuxDrop</h1>
  <p><strong>The Democratic Aux Cord for Shared Spaces</strong></p>
  <p>
    <a href="#features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#deployment">Deployment</a>
  </p>
</div>

<br />

**AuxDrop** is a real-time, room-based collaborative music queue application. Built for parties, road trips, and shared spaces, it solves the problem of a single person monopolizing the aux cord. Guests can join a session via a simple 6-digit code, search YouTube for music, add tracks, and democratically upvote/downvote the queue. The application automatically handles playback on the Host's device while staying in perfect sync with all connected users.

---

## ⚡ Features

### 🎵 Collaborative Queue & Democratic Voting
- **Live Syncing:** Songs added by any user instantly appear on everyone's device via WebSockets.
- **Democratic Upvoting:** Users can upvote (+1) or downvote (-1) tracks in the queue. The queue constantly reorders itself based on score, ensuring the most popular tracks play next.
- **Auto-Skip Threshold:** Tracks that fall below a specific negative score threshold (e.g., heavily downvoted) are visually flagged and pushed to the bottom.

### 📱 Host Controls & Mobile Optimization
- **Full Playback Control:** The Host controls the physical audio output via the hidden YouTube IFrame API, featuring play/pause, volume, 10s Fast-Forward/Rewind, and progress bar seeking.
- **Queue Override:** The Host can long-press (or right-click) any track to override the democratic vote and manually force it Up/Down the queue.
- **Mobile WakeLock:** Automatically requests the OS WakeLock API when the Host plays a track on mobile, preventing screen sleep and ensuring continuous, uninterrupted background playback.

### 🔍 Advanced Import Tools
- **YouTube Integration:** Search for any song on YouTube directly from the app interface.
- **Playlist Bulk Import:** Instantly import up to 50 tracks from public/unlisted YouTube playlists (e.g., `list=PL...`) with a single click.

### 🎨 Premium "Netflix-Inspired" UI
- Built with a high-fidelity, animation-rich, dark-mode-first aesthetic.
- Features glassmorphism, contextual user bubbles, and real-time state transitions without bulky frameworks.

---

## 🛠 Tech Stack

### Frontend
- **Framework:** Vanilla JavaScript (ES6 Modules)
- **Bundler:** Vite
- **Styling:** Vanilla CSS (CSS Variables, Flexbox/Grid, Keyframe Animations)
- **Player API:** YouTube IFrame Player API

### Backend
- **Runtime:** Node.js
- **Server:** Express.js
- **Real-Time Communication:** Socket.io
- **State Management:** In-Memory Map (Session & Queue Managers)

### External APIs
- **YouTube Data API v3:** Powers track search and playlist extraction.

---

## 🏗 Architecture

AuxDrop operates on a highly decoupled client-server model optimized for rapid, real-time events.

1. **Session Manager:** Handles the creation of 6-character room codes (`server/managers/session-manager.js`). Maps unique `socket.id` connections to users.
2. **Queue Manager:** Maintains an isolated array of tracks for every active session (`server/managers/queue-manager.js`). Handles the complex sorting logic based on `score` and `addedAt` tiebreakers.
3. **Socket Orchestrator:** The `index.js` file on the server listens for granular events (`add_song`, `vote_song`, `move_song`, `skip_current`) and broadcasts localized updates (`queue_updated`, `now_playing`) exclusively to users in that specific room using Socket.io namespaces/rooms.

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js (v18+)
- A YouTube Data API v3 Key ([Google Cloud Console](https://console.cloud.google.com/))

### 1. Clone the Repository
\`\`\`bash
git clone https://github.com/Ibaner20065/auxdrop.git
cd auxdrop
\`\`\`

### 2. Setup the Backend
\`\`\`bash
cd server
npm install
npm run dev
\`\`\`
*The server will start on `http://localhost:3001`.*

### 3. Setup the Frontend
Open a new terminal window:
\`\`\`bash
cd client
npm install
\`\`\`

Create a `.env` file in the `client` directory:
\`\`\`env
VITE_BACKEND_URL=http://localhost:3001
VITE_YOUTUBE_API_KEY=your_youtube_data_api_key_here
\`\`\`

Start the frontend development server:
\`\`\`bash
npm run dev
\`\`\`
*The client will start on `http://localhost:5173`.*

---

## 🌍 Deployment

AuxDrop is designed for simple, split deployment:

### Backend (Render)
1. Connect the repository to **Render.com**.
2. Create a new **Web Service**.
3. Set the Root Directory to `server`.
4. Build Command: `npm install`
5. Start Command: `npm start`
6. *Note: Ensure your Render service is configured to handle WebSocket traffic.*

### Frontend (Vercel)
1. Connect the repository to **Vercel**.
2. Set the Root Directory to `client`.
3. Add the following Environment Variables in the Vercel dashboard:
   - \`VITE_BACKEND_URL\`: Your deployed Render URL (e.g., `https://auxdrop-backend.onrender.com`).
   - \`VITE_YOUTUBE_API_KEY\`: Your YouTube Data API Key.
4. **Important API Security:** In your Google Cloud Console, ensure you whitelist your Vercel production domain under the YouTube API Key's HTTP Referrer restrictions to prevent `403` errors.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
