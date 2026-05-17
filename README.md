# AuxDrop - The Democratic Aux Cord 🎵🔥

Welcome to **AuxDrop**, a retro-90s inspired application designed to gamify music selection in shared spaces. It uses a host/client architecture where one person hosts the YouTube player and others join the room to queue and upvote songs democratically.

## Features
- **Retro 90s "Windows 95" Aesthetic:** Includes outset bevels, system fonts, and glorious animated marquees.
- **Democratic Queue:** Add songs and upvote your favorites. The highest upvoted songs play first.
- **Album Art Gradient Background:** The background dynamically blurs and color-matches the currently playing song's album art.
- **Play/Pause/Skip Controls:** Host controls for audio management.

## Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (Node Package Manager)

## Setup Instructions

### 1. Configure the Environment
You need a YouTube Data API v3 key to enable song searching.
Create a `.env` file inside the `client/` directory and add your API key:

```env
VITE_YOUTUBE_API_KEY=your_api_key_here
```

*(Note: The `.env` file is included in `.gitignore` to prevent leaking your key to GitHub).*

### 2. Install Dependencies
Navigate to the root directory of the project in your terminal and install the required Node modules:

```bash
npm install
```

### 3. Run on Localhost
Start both the backend server and the frontend Vite development server concurrently by running:

```bash
npm run dev
```

This will automatically launch:
- The **Backend WebSocket Server** on port `3000`.
- The **Frontend Application** typically on `http://localhost:5173`.

### 4. Using the App
1. **Host a Session**: Click "Start a Session" on the landing page. Share the generated 4-letter room code with your friends.
2. **Join a Session**: Your friends can enter the room code on their devices to join.
3. **Queue Songs**: Click "Add Song", search for a track, and add it.
4. **Vote**: Click the "Upvote" button on songs in the queue to bump them to the top.
5. **Player Controls**: As the host, you can use the player controls at the bottom of the screen to play, pause, or skip tracks.

Enjoy the jams! 🚀
