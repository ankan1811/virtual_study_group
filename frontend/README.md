# Virtual Study Group — Frontend

Real-time collaborative study platform built with React, TypeScript, and Vite.

## Tech Stack

- **React 18** + **TypeScript** + **Vite** (dev server on port 5175)
- **Tailwind CSS v3** + **tailwindcss-animate** for styling
- **Redux Toolkit** for state management (4 slices: auth, room, invite, companion)
- **Framer Motion** for animations (sidebar, modals, toasts, popovers)
- **Socket.IO Client** for real-time events (chat, DMs, presence, invites, companion requests)
- **Agora RTC SDK** for video/audio calls
- **Axios** for REST API calls
- **Web Speech API** for voice input in AI panel

## Features

### Home Dashboard (`RoomPage`)
- **Global People Search** — inline search bar at the top of the page. Debounced live search when logged in. Logged-out users see blurred dummy cards with a "Login to search" prompt.
- **Companion Requests Section** — fetches pending requests from `GET /companion/pending` on mount. Each request card shows the requester's avatar/name with Accept and Decline buttons. Real-time updates via `companion:requestReceived` socket event. Cards animate in/out with Framer Motion springs.
- **Study Companions Bar** — horizontal scrollable row of companion avatars with:
  - **Online/offline dot** (bottom-right, green = online, grey = offline)
  - **Unread DM green ring** — avatar ring turns emerald when a companion sends a DM while the DM panel is closed. Clears when you open the conversation. Tracked via `dm:receive` socket listener with a ref-based stale-closure guard.
  - **Popover** on click — shows online status, Message button (with unread dot), and Invite to Room button
  - Logged-out state shows dummy companions (some with green rings as preview)
- **CTA Section** — gradient card with "Enter My Room" (logged in) or "Get Started" (logged out)
- **News Feed** — category-filtered (All / AI / Tech / Productivity) article cards. Controlled by `VITE_NEWS_IMAGES_ONLY` env var to show only articles with images.
- **Add Companion Modal** — search users by name/email, send companion requests
- **DM Panel** — slide-in panel for real-time direct messaging with a companion

### Navbar
- **Sidebar** (left) — hamburger toggle, slide-in panel with navigation links, dark mode toggle, logout
- **Profile Avatar** (top-right) — gradient circle with user initials. Click opens a dropdown with: My Profile, Settings, My Room, Ask AI, Logout. Logged-out users see a login icon button.
- **Dark Mode Toggle** — persistent toggle in both the floating top-left button and inside the sidebar

### Room Call (`RoomCallPage`)
- Agora RTC video/audio with mic/camera controls
- Tab panel: Chat / AI Doubt Solver / Session Summary
- Room ID from Redux state (not URL or localStorage)

### AI Integration
- **Doubt Solver** — text + voice input (Web Speech API), powered by Grok (xAI) via `grok-3-mini`
- **Session Summary** — generates AI summary from chat messages

### Live Streaming (`Streampage`)
- Camera preview, YouTube RTMP stream key input, start/stop controls
- FFmpeg child process on backend for RTMP output

## State Management (Redux Toolkit)

| Slice | State | Key Actions |
|-------|-------|-------------|
| `auth` | `isAuthenticated`, `user` | `login`, `logout` |
| `room` | `currentRoomId`, `isOwner` | `enterRoom`, `leaveRoom` |
| `invite` | `pendingInvite` | `receiveInvite`, `clearInvite` |
| `companion` | `companions[]`, `pendingRequests[]` | `setCompanions`, `setOnline`, `setOffline`, `setPendingRequests`, `addPendingRequest`, `removePendingRequest`, `addCompanion` |

## Environment Variables

```env
VITE_API_URL=http://localhost:7002          # Backend API base URL
VITE_STREAM_SOCKET_URL=http://localhost:3002 # Streaming socket server
VITE_NEWS_IMAGES_ONLY=true                   # "true" = only show news with images, "false" = show all
```

## Getting Started

```bash
cd frontend
npm install
npm run dev    # starts on http://localhost:5175
```

Requires the backend running on port 7002 (see `backend/README.md` or `backend/.env`).

## Socket Events Used

| Event | Direction | Purpose |
|-------|-----------|---------|
| `companion:online` | Server → Client | Companion came online |
| `companion:offline` | Server → Client | Companion went offline |
| `companion:requestReceived` | Server → Client | Incoming companion request |
| `companion:accepted` | Server → Client | Someone accepted your request |
| `dm:receive` | Server → Client | Incoming DM (also used for unread tracking) |
| `dm:join` | Client → Server | Join a DM room |
| `dm:send` | Client → Server | Send a DM message |
| `sendInvite` | Client → Server | Invite companion to room |
| `receiveInvite` | Server → Client | Incoming room invite |
| `inviteError` | Server → Client | Invite failed |
| `joinRoom` | Client → Server | Join a chat room |
| `serverMessage` | Client → Server | Send chat message |
