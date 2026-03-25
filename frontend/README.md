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

## Backend Database & Caching Architecture

The backend uses a **triple-layer data architecture** — the frontend interacts with all through the same REST API and Socket.IO events:

- **PostgreSQL (NeonDB + Drizzle ORM)** — all structured relational data: users, rooms, companions, notifications, DMs, chats, upload/embedding counters. UUID primary keys.
- **MongoDB (Mongoose)** — unstructured/flexible data: AI summaries (variable-length HTML + 768-dim embedding vectors for RAG).
- **Upstash Redis** — TTL-based caching and transient data: OTP hashes (auto-expire after 5 min), podcast cache (4-day TTL, replaces former MongoDB cache), and distributed rate limiting (sliding window algorithm via `@upstash/ratelimit`). REST-based client (no TCP connection pools, serverless-friendly).

The frontend doesn't need to know which database handles what — all data flows through the same API endpoints. This split is entirely a backend concern.

## Features

### Authentication (`AuthPage`)
- **Two auth methods:** OTP-based email verification and single-click Google OAuth
- **Google OAuth** — "Continue with Google" button using `@react-oauth/google`. Uses `useGoogleLogin` hook to get an access token, sends it to `POST /auth/google` for backend verification. Works for both new registrations and existing logins. Google Client ID via `VITE_GOOGLE_CLIENT_ID` env var.
- **OTP flow** — two-step: enter email → receive OTP → enter OTP → authenticated. Resend OTP with 30-second cooldown, "Change email" back button. OTP is validated entirely server-side via Upstash Redis (TTL auto-expiry) — frontend only sends `{ email, otp }` (no hash/expires needed).
- **OTP emails sent via Resend** — professional email delivery service (replaced Gmail SMTP). Uses `RESEND_API_KEY` and `RESEND_FROM_EMAIL` env vars on backend.
- On success: dispatches Redux login, stores JWT in localStorage, connects socket, navigates to `/home` (or to a pending invite room if the user arrived via a `/join/:roomId` link)

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
- Gradient banner with large avatar circle, user name, and "Student" label
- **Default avatar picker** — 5 themed avatars (Cool Guy, Scholar, Scientist, Artist, Astronaut) with emoji + gradient backgrounds. Camera icon overlay on the avatar opens a modal picker (Framer Motion spring). "Use Initials Instead" option to revert to letter-based avatar. Avatar saved instantly to backend + Redux (`updateAvatar` action)
- Avatar persists on refresh — `AppInner` fetches `/user/profile` on JWT rehydration and dispatches `updateAvatar`. Shared constants in `utils/avatars.ts`
- **Editable fields:** name (inline input) and bio (textarea)
- **Read-only:** email display
- Stats row showing companion count and email
- **Education section** — degree, institution, year. View mode shows styled card; edit mode shows 3 input fields. Icon: `GraduationCap`
- **Projects showcase** — up to 2 projects (title, description, link). View mode shows mini cards with "View" link pill (`ExternalLink` icon); edit mode shows add/remove project cards with dashed "Add Project" button. Icon: `FolderGit2`
- **Work Experience** — company, role (indigo badge), duration, description. View mode shows styled card; edit mode shows 4 input fields. Icon: `Briefcase`
- All sections share global edit toggle — one Edit/Save session covers entire profile
- Empty states with italic placeholder text ("No education added yet. Click Edit Profile to add!")
- Staggered Framer Motion entry animations (0.1s delay increments per section)
- Save button calls `PUT /user/profile` (name, bio, avatar, education, projects, workExperience), re-issues JWT, updates Redux auth state
- Styled with Tailwind + Framer Motion (consistent with existing pages)

### Settings (`SettingsPage`)
- Accessible from the profile avatar dropdown ("Settings") — navigates to `/settings`
- **Appearance** — dark mode toggle (functional, uses `useDarkMode` hook), display link
- **Notifications** — push notifications toggle, sound effects toggle
- **General** — language, privacy & security links
- **About** — version info
- **Account actions** — Edit Profile (navigates to `/profile`), Log Out
- Premium design: staggered Framer Motion entry animations, decorative background blobs, grouped cards with custom toggle switches
- Auth-guarded with JWT rehydration race condition handling

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
- **Sidebar** (left) — hamburger toggle, slide-in panel with navigation links (Home, Chats, Summaries, My Room, Ask AI, Study Radio, Podcasts, Contact us), dark mode toggle, logout
- **Profile Avatar** (top-right) — gradient circle showing emoji avatar (when set) or initials (default). Click opens a dropdown with: My Profile, Settings, My Room, Ask AI, Logout. Avatar gradient and emoji update live from Redux. Logged-out users see a login icon button.
- **Dark Mode Toggle** — persistent toggle in both the floating top-left button and inside the sidebar
- **Logout** — properly clears JWT from localStorage, disconnects socket, resets Redux state, redirects to `/login`

### Room Call (`RoomCallPage`)
- **Agora opt-in** — video call only starts when the user clicks "Start Video Call" in the lobby. Chat, AI, and whiteboard tools are available immediately without consuming Agora hours. End call via red PhoneOff button in the video grid.
- Tab panel: Chat / AI Doubt / Whiteboard (Whiteboard tab navigates to full-page `/whiteboard/:roomId`)
- Room ID from Redux state (not URL or localStorage)
- **Bottom action bar** — below the tab content with Invite and Summary buttons. Summary button only appears on the Chat tab, disabled when no user messages exist, shows loading/saved states.
- **Shareable invite link** — "Invite" button copies a permanent link (`/join/{roomId}`) to clipboard. Animated swap to a green "Copied!" checkmark for 2 seconds (Framer Motion). The link is permanent since room IDs (`user_{userId}`) never change
- Bot messages in chat support clickable URLs (Linkify helper) with special styling for summary notifications
- **Opt-in chat persistence:**
  - Inline "Save" button in chat panel — disabled when nothing to save, re-enables on new messages, shows "Saved" checkmark on success
  - `SaveChatPrompt` modal on exit — "Save & Exit" or "Exit without saving". Skipped if all messages already saved
  - `useBlocker` intercepts React Router navigation; `beforeunload` guards browser tab close
  - `NavbarCall` exit button uses programmatic navigation (no `<Link>`) to allow interception

### Summaries (`SummariesPage`)
- Dedicated page at `/summaries` accessible from sidebar ("Summaries" nav item with FileText icon)
- **Three sub-tabs:** Room Chat, DM Chat, Whiteboard — each shows saved summaries filtered by type
- Fetches `GET /ai/summaries?type=room|dm|whiteboard` on mount and tab switch
- Summary cards with type badge, title, date, expandable content, and delete button
- Delete calls `DELETE /ai/summaries/:id` with ownership check
- Follows ChatsPage layout pattern with consistent dark mode support
- **Generate summary buttons** placed contextually:
  - Room chat: Summary button in bottom action bar of RoomCallPage (Chat tab only)
  - Whiteboard: Summary button in WhiteboardPage toolbar (between Clear and AI Assist)
  - DM: Summary icon button (FileText) in DmPanel header
- All use shared `generateAndSaveSummary()` utility from `utils/summaryApi.ts`
- **RAG-powered Q&A panel** — collapsible panel above the sub-tabs with:
  - Text input + send button for natural language questions across all saved summaries
  - 3 suggestion chips ("What topics did I study this week?", "Summarize my recent sessions", "What questions came up in my last study session?")
  - AI-generated answers with source citation badges (color-coded by summary type)
  - Rate limit and error handling with amber warning styling
  - Framer Motion AnimatePresence for smooth expand/collapse
  - Calls `POST /ai/summary-qa` — backend embeds the question via Gemini embedding model (configurable via `GEMINI_EMBEDDING_MODEL` env var, default `text-embedding-004`), finds top 5 most similar summaries via cosine similarity, passes them as context to Gemini 2.5 Flash
  - All state local (no Redux): `qaOpen`, `qaQuestion`, `qaAnswer`, `qaSources`, `qaLoading`, `qaError`

### AI Integration
- **Doubt Solver** — text + voice input (Web Speech API), powered by switchable AI (Gemini/Grok). Full dark mode support for input, Q&A bubbles, loading states, and mic button.
- **Save Summary** — one-click save to Cloudflare R2 (S3-compatible) as a styled HTML document + MongoDB persistence (with vector embedding for RAG Q&A). Returns a presigned download URL (valid 7 days). After saving, a VSG Bot message is broadcast to the room chat with the download link so all participants can access it.

### AI Whiteboard (`WhiteboardPage`)
- **Full-page collaborative whiteboard** — opens as a dedicated route (`/whiteboard/:roomId`) when the Whiteboard tab is clicked in `RoomCallPage`. Full drawing tools (shapes, text, freehand, arrows) powered by `@excalidraw/excalidraw`, lazy-loaded via `React.lazy()`.
- **Real-time collaboration** — all room participants see the same whiteboard live via Socket.IO. Drawing changes are debounced (200ms client-side) and throttled (100ms server-side). Echo-loop prevention via `isRemoteUpdate` ref flag.
- **Built-in AI Assist sidebar** — collapsible right panel (360px, Framer Motion spring animation) with "Explain This" button and custom question input. Sends compact text descriptions to Gemini/Grok. Q&A history with teal-accented chat bubbles.
- **Toolbar** — top bar with Back to Room, Clear whiteboard, Summary (generates + saves whiteboard summary), and AI Assist toggle buttons.
- **Whiteboard data for AI** — elements are simplified before sending to the LLM: text content for text elements, type + dimensions for shapes. No raw JSON sent (too verbose).

### Podcasts (`PodcastsPage`)
- **Full-page podcast discovery** at `/podcasts` — accessible from sidebar with Mic2 icon
- **5 topic tabs**: Trending | AI | Tech | Business | Productivity & Tools
- Lazy-fetches each topic on first tab visit via `GET /podcasts/:topic` — backend caches in Upstash Redis (4-day TTL, replaces former MongoDB cache). Subsequent visits in the same session use component-state cache (no extra API calls)
- **Animated tab bar** — Framer Motion `layoutId="podcast-tab-bg"` sliding gradient highlight. Each topic has its own gradient + card accent color
- **Refresh banner** — pulsing indigo dot + "Fresh drops every Tue & Sat — stay ahead of the curve." + "Curated for the curious learner" subtext
- **Podcast cards** — top accent strip (topic color), thumbnail (fallback to Mic2 icon), title (line-clamp-2), publisher, description (line-clamp-3), listen score badge (Star icon, amber), episode count, "Listen Now" → Listen Notes URL
- **Source badges** — amber notice shown when backend returns `source: "stale-cache"` or `source: "mock"`
- **Skeleton loading grid** — 8 ghost cards with `animate-pulse` while fetching
- **Error state** with AlertCircle icon and "Try again" retry button
- Page background matches RadioPage pattern (fixed gradient orbs, dark/light mode)
- No Redux needed — all state is local (`activeTab`, `topicCache`, `loading`, `error`)

### Study Radio (`RadioPage`)
- **Full-page radio player** at `/radio` — browse and play curated internet radio channels from SomaFM (ambient, chill, electronic, etc.)
- **8 curated channels** — Groove Salad, Drone Zone, Lush, Space Station Soma, DEF CON Radio, Boot Liquor, Fluid, Groove Salad Classic. Defined in `data/radioChannels.ts`.
- **RadioContext** — global React context (`context/RadioContext.tsx`) with `useReducer` for state management. Manages `HTMLAudioElement` + `Web Audio API` (`AnalyserNode`) for real-time visualizations. State persisted to `sessionStorage` across navigation.
- **Audio visualizer** — canvas-based frequency bar visualization (`RadioVisualizer`) with full and mini variants. Falls back to animated CSS bars when `AnalyserNode` returns zero data.
- **MiniPlayer** — floating bottom-right mini player (`MiniPlayer.tsx`) shown on all pages except `/radio`. Play/pause, volume, mute, expand to full page, and close controls. Auto-hides when no channel is playing.
- **Accessible from sidebar** — "Study Radio" nav item with headphones icon.

### Join Room via Link (`JoinRoomPage`)
- Auth-gated redirect page at `/join/:roomId` — handles shareable invite links
- If logged in: dispatches `enterRoom({ roomId, isOwner: false })` and redirects to `/room/call`
- If not logged in: stores roomId in `sessionStorage("pendingJoinRoom")`, redirects to `/login`. After successful auth, automatically redirects back to the room
- Link is **permanent** — room IDs (`user_{userId}`) never change, so the same link always works

### Live Streaming (`Streampage`)
- Camera preview, YouTube RTMP stream key input, start/stop controls
- FFmpeg child process on backend for RTMP output

## State Management (Redux Toolkit)

| Slice | State | Key Actions |
|-------|-------|-------------|
| `auth` | `isAuthenticated`, `user` | `login`, `logout` (+ token/socket cleanup), `updateName`, `updateAvatar` |
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

Requires the backend running on port 7002 with both NeonDB (PostgreSQL) and MongoDB connected. See `backend/.env` for `DATABASE_URL` and `MONGODB_URI` configuration. Run `npx drizzle-kit generate && npx drizzle-kit migrate` in `backend/` on first setup to create PostgreSQL tables.

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
