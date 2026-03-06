# Virtual Study Group — Frontend

Real-time collaborative study platform built with React, TypeScript, and Vite.

## Tech Stack

- **React 18** + **TypeScript** + **Vite** (dev server on port 5175)
- **Tailwind CSS v3** + **tailwindcss-animate** for styling
- **Redux Toolkit** for state management (4 slices: auth, room, invite, companion)
- **Framer Motion** for animations (sidebar, modals, toasts, popovers)
- **Socket.IO Client** for real-time events (chat, DMs, presence, invites, companion requests)
- **Agora RTC SDK** for video/audio calls
- **@react-oauth/google** for single-click Google OAuth sign-in
- **Axios** for REST API calls
- **Web Speech API** for voice input in AI panel
- **@excalidraw/excalidraw** for collaborative whiteboard (lazy-loaded)
- **SomaFM** internet radio streams for Study Radio (ambient/chill background music)

## Features

### Authentication (`AuthPage`)
- **Two auth methods:** OTP-based email verification and single-click Google OAuth
- **Google OAuth** — "Continue with Google" button using `@react-oauth/google`. Uses `useGoogleLogin` hook to get an access token, sends it to `POST /auth/google` for backend verification. Works for both new registrations and existing logins. Google Client ID via `VITE_GOOGLE_CLIENT_ID` env var.
- **OTP flow** — two-step: enter email → receive OTP → enter OTP → authenticated. Resend OTP with 30-second cooldown, "Change email" back button.
- On success: dispatches Redux login, stores JWT in localStorage, connects socket, navigates to `/home`

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

### User Profile (`ProfilePage`)
- Accessible from the profile avatar dropdown ("My Profile") — navigates to `/profile`
- Gradient banner with large initials-based avatar circle, user name, and "Student" label
- **Editable fields:** name (inline input) and bio (textarea)
- **Read-only:** email display
- Stats row showing companion count and email
- Save button calls `PUT /user/profile`, re-issues JWT, updates Redux auth state with new name
- Styled with Tailwind + Framer Motion (consistent with existing pages)

### Chats (`ChatsPage`)
- WhatsApp-style recent conversations list at `/chats`, accessible from sidebar ("Chats" nav item)
- Fetches `GET /dm/recent` on mount — aggregated last message per conversation partner, sorted by most recent
- Each conversation row shows: companion avatar (initials), name, last message preview (truncated, with "You:" prefix for sent messages), relative timestamp (via `date-fns`), unread badge count
- **Bold styling** for unread conversations, muted grey for read
- Search bar to filter conversations by companion name
- Clicking a row opens the existing `DmPanel` as a slide-in overlay
- **Real-time updates:** listens to `dm:receive` socket event to bump new messages to the top of the list
- Empty state when no conversations yet

### Navbar
- **Sidebar** (left) — hamburger toggle, slide-in panel with navigation links (Home, Chats, My Room, Study Radio, Streaming, Ask AI, Contact us), dark mode toggle, logout
- **Profile Avatar** (top-right) — gradient circle with user initials. Click opens a dropdown with: My Profile, Settings, My Room, Ask AI, Logout. Logged-out users see a login icon button.
- **Dark Mode Toggle** — persistent toggle in both the floating top-left button and inside the sidebar
- **Logout** — properly clears JWT from localStorage, disconnects socket, resets Redux state, redirects to `/login`

### Room Call (`RoomCallPage`)
- Agora RTC video/audio with mic/camera controls (App ID via `VITE_AGORA_APP_ID` env var)
- Tab panel: Chat / AI Doubt Solver / Summary / Whiteboard (Whiteboard tab navigates to full-page `/whiteboard/:roomId`)
- Room ID from Redux state (not URL or localStorage)
- Bot messages in chat support clickable URLs (Linkify helper) with special styling for summary notifications
- **Opt-in chat persistence:**
  - Inline "Save" button in chat panel — disabled when nothing to save, re-enables on new messages, shows "Saved" checkmark on success
  - `SaveChatPrompt` modal on exit — "Save & Exit" or "Exit without saving". Skipped if all messages already saved
  - `useBlocker` intercepts React Router navigation; `beforeunload` guards browser tab close
  - `NavbarCall` exit button uses programmatic navigation (no `<Link>`) to allow interception

### AI Integration
- **Doubt Solver** — text + voice input (Web Speech API), powered by switchable AI (Gemini/Grok)
- **Session Summary** — Summary tab has two sub-tabs:
  - **Chat Summary** — generates AI summary from chat messages
  - **Whiteboard Summary** — generates AI summary from whiteboard drawings
- Both summaries can be saved to Cloudflare R2 with presigned download URLs
- **Save Summary** — one-click save to Cloudflare R2 (S3-compatible) as a styled HTML document. Returns a presigned download URL (valid 7 days). After saving, a VSG Bot message is broadcast to the room chat with the download link so all participants can access it.

### AI Whiteboard (`WhiteboardPage`)
- **Full-page collaborative whiteboard** — opens as a dedicated route (`/whiteboard/:roomId`) when the Whiteboard tab is clicked in `RoomCallPage`. Full drawing tools (shapes, text, freehand, arrows) powered by `@excalidraw/excalidraw`, lazy-loaded via `React.lazy()`.
- **Real-time collaboration** — all room participants see the same whiteboard live via Socket.IO. Drawing changes are debounced (200ms client-side) and throttled (100ms server-side). Echo-loop prevention via `isRemoteUpdate` ref flag.
- **Built-in AI Assist sidebar** — collapsible right panel (360px, Framer Motion spring animation) with "Explain This" button and custom question input. Sends compact text descriptions to Gemini/Grok. Q&A history with teal-accented chat bubbles.
- **Toolbar** — top bar with Back to Room, Clear whiteboard, and AI Assist toggle buttons.
- **Whiteboard data for AI** — elements are simplified before sending to the LLM: text content for text elements, type + dimensions for shapes. No raw JSON sent (too verbose).

### Study Radio (`RadioPage`)
- **Full-page radio player** at `/radio` — browse and play curated internet radio channels from SomaFM (ambient, chill, electronic, etc.)
- **8 curated channels** — Groove Salad, Drone Zone, Lush, Space Station Soma, DEF CON Radio, Boot Liquor, Fluid, Groove Salad Classic. Defined in `data/radioChannels.ts`.
- **RadioContext** — global React context (`context/RadioContext.tsx`) with `useReducer` for state management. Manages `HTMLAudioElement` + `Web Audio API` (`AnalyserNode`) for real-time visualizations. State persisted to `sessionStorage` across navigation.
- **Audio visualizer** — canvas-based frequency bar visualization (`RadioVisualizer`) with full and mini variants. Falls back to animated CSS bars when `AnalyserNode` returns zero data.
- **MiniPlayer** — floating bottom-right mini player (`MiniPlayer.tsx`) shown on all pages except `/radio`. Play/pause, volume, mute, expand to full page, and close controls. Auto-hides when no channel is playing.
- **Accessible from sidebar** — "Study Radio" nav item with headphones icon.

### Live Streaming (`Streampage`)
- Camera preview, YouTube RTMP stream key input, start/stop controls
- FFmpeg child process on backend for RTMP output

## State Management (Redux Toolkit)

| Slice | State | Key Actions |
|-------|-------|-------------|
| `auth` | `isAuthenticated`, `user` | `login`, `logout` (+ token/socket cleanup), `updateName` |
| `room` | `currentRoomId`, `isOwner` | `enterRoom`, `leaveRoom` |
| `invite` | `pendingInvite` | `receiveInvite`, `clearInvite` |
| `companion` | `companions[]`, `pendingRequests[]` | `setCompanions`, `setOnline`, `setOffline`, `setPendingRequests`, `addPendingRequest`, `removePendingRequest`, `addCompanion` |

## Environment Variables

```env
VITE_API_URL=http://localhost:7002          # Backend API base URL
VITE_STREAM_SOCKET_URL=http://localhost:3002 # Streaming socket server
VITE_NEWS_IMAGES_ONLY=true                   # "true" = only show news with images, "false" = show all
VITE_AGORA_APP_ID=your_agora_app_id         # Agora RTC App ID (from https://console.agora.io)
VITE_GOOGLE_CLIENT_ID=your_google_client_id # Google OAuth Client ID (from https://console.cloud.google.com)
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
| `dm:send` | Client → Server | Send a DM message (throttled: 200ms) |
| `sendInvite` | Client → Server | Invite companion to room (throttled: 3s) |
| `receiveInvite` | Server → Client | Incoming room invite |
| `inviteError` | Server → Client | Invite failed or throttled |
| `joinRoom` | Client → Server | Join a chat room |
| `serverMessage` | Client → Server | Send chat message |
| `dm:error` | Server → Client | DM send throttled (too frequent) |
| `companion:error` | Server → Client | Companion request throttled (too frequent) |
| `whiteboard:update` | Client → Server | Broadcast whiteboard element changes to room (debounced 150ms) |
| `whiteboard:sync` | Server → Client | Incoming whiteboard changes from another participant |
| `whiteboard:clear` | Client → Server | Clear the whiteboard for all room participants |
| `whiteboard:cleared` | Server → Client | Whiteboard was cleared by another participant |
