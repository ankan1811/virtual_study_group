# Virtual Study Group

A full-stack web application for creating virtual study group spaces with real-time video conferencing, live chat, AI-powered doubt solving, companion messaging, and collaborative study tools.

## Tech Stack

| Layer                | Technology                                                        |
| -------------------- | ----------------------------------------------------------------- |
| **Backend**          | Node.js, Express, TypeScript                                      |
| **Frontend**         | React 18, TypeScript, Vite                                        |
| **Database**         | MongoDB (Mongoose)                                                |
| **Real-time**        | Socket.IO                                                         |
| **Video Calls**      | Agora RTC SDK                                                     |
| **AI**               | Switchable: Google Gemini 2.5 Flash (default) / xAI Grok          |
| **RAG / Embeddings** | Gemini `text-embedding-004` (768-dim vectors, free tier)          |
| **Cloud Storage**    | Cloudflare R2 (S3-compatible, free tier) for summary persistence  |
| **State Management** | Redux Toolkit                                                     |
| **Whiteboard**       | @excalidraw/excalidraw (MIT, client-side, lazy-loaded)            |
| **Study Radio**      | SomaFM internet radio streams (ambient/chill/electronic)          |
| **Styling**          | Tailwind CSS, shadcn/ui, Framer Motion                            |
| **Auth**             | Stateless OTP (HMAC-SHA256) + Google OAuth + JWT + nodemailer     |
| **Rate Limiting**    | express-rate-limit (per-user + per-IP, all thresholds via env vars) |
| **Streaming**        | FFmpeg (RTMP to YouTube Live)                                     |
| **Audio Viz**        | P5.js                                                             |
| **News Feed**        | Mock articles (AI / Tech / Productivity categories, 30-min cache) |

## Features

### Authentication (OTP + Google OAuth)

- **Two sign-in methods:** passwordless OTP and single-click Google OAuth
- **Google OAuth** — "Continue with Google" button on the auth page. Uses `@react-oauth/google` on frontend to get an access token, backend verifies it against Google's userinfo API (`POST /auth/google`). Works for both new registrations and existing logins. Stores `googleId` on the User model for account linking. Google Client ID via `VITE_GOOGLE_CLIENT_ID` env var.
- **Passwordless OTP auth** — no passwords stored. Users verify email ownership via a 6-digit OTP on every login/register
- **Stateless OTP** — HMAC-SHA256 signed hash (no OTP stored in DB). Server generates OTP + hash, emails OTP to user, client sends back OTP + hash for verification
- **Configurable expiry** via `OTP_EXPIRY_MINUTES` env var (default: 5 minutes)
- **Two-step frontend flow:** enter email → receive OTP → enter OTP → authenticated
- Resend OTP with 30-second cooldown, "Change email" back button
- JWT token-based session after successful OTP verification
- Protected routes for authenticated users
- Persistent auth state via Redux + localStorage
- JWT rehydration on page refresh (no re-login needed)
- **Logout** — clears JWT from localStorage, disconnects socket, resets Redux state, redirects to login

### Personal Rooms & Invite System

- Every user has a personal room (`user_{userId}`) — no room IDs to remember
- **Shareable invite link** — "Invite" button in the room call page copies a permanent link (`/join/{roomId}`) to clipboard with animated feedback. Anyone with the link can join (logged-in users only; unauthenticated users are redirected to login and auto-joined after auth)
- Only study companions can invite each other directly via real-time socket invites
- Real-time invite notifications with accept/decline overlay
- "Enter My Room" one-click access from the home page and sidebar

### Study Companions

- Send, accept, and decline companion requests (friend system)
- Search for companions by name or email
- Real-time presence tracking (online/offline status)
- Companion bar on home page with avatar initials and status rings
- Companion popover with quick actions: Message, Invite to Room
- Real-time companion request notifications via overlays

### User Profile

- Profile page accessible from the profile avatar dropdown ("My Profile")
- Gradient banner with large avatar circle, name, and "Student" label
- **Default avatar picker** — 5 themed avatars (Cool Guy, Scholar, Scientist, Artist, Astronaut) with emoji + gradient backgrounds. Camera icon overlay opens a modal picker with spring animations. "Use Initials Instead" option to revert to letter-based avatar
- Avatar selection **saved instantly** to backend and Redux store. Persists across refreshes via API fetch on JWT rehydration (avatar not stored in JWT)
- Avatar updates reflect **live across all UI** — Navbar top-right button, profile dropdown header, and profile page all read from Redux
- Shared avatar constants in `frontend/src/utils/avatars.ts` (used by ProfilePage + Navbar)
- Editable name and bio with inline edit/save mode
- Stats row showing companion count and email
- Profile updates re-issue JWT and sync Redux state instantly
- Extended User model with `bio` and `avatar` fields

### Settings

- **Settings page** at `/settings` accessible from the profile avatar dropdown ("Settings")
- **Appearance** section — functional dark mode toggle (uses existing `useDarkMode` hook), display preferences link
- **Notifications** section — push notifications toggle, sound effects toggle
- **General** section — language, privacy & security links
- **About** section — app version info
- **Account actions** — Edit Profile button (navigates to `/profile`), Log Out button
- Premium design with staggered Framer Motion entry animations, decorative background blobs, grouped setting cards with dividers
- Auth-guarded — redirects to login if not authenticated (with JWT rehydration race condition handling)

### Direct Messaging (DM)

- Slide-in DM panel from companion avatars
- Real-time messaging powered by Socket.IO
- Deterministic socket room naming (`dm_{sortedUserIds}`)
- Message history stored in MongoDB (last 50 loaded on open)
- **Full message delivery pipeline**: `pending → delivered → read`
  - 🕐 Clock = sending (optimistic, before server ack)
  - ✓ Single tick = delivered (saved to DB)
  - ✓✓ Double tick = read (recipient opened the panel)
- Unread badge (green ring on avatar) **persists across refreshes** — restored from `GET /dm/unread-counts` on mount
- `dm:markRead` socket event instantly notifies sender when recipient opens the conversation

### Chats Page (Recent Conversations)

- WhatsApp-style recent chats list accessible from the sidebar ("Chats" nav item)
- Shows all DM conversations sorted by most recent message (descending)
- Each row displays: companion avatar (initials), name, last message preview, relative timestamp, unread badge count
- Bold styling for unread conversations, muted for read
- Search bar to filter conversations by companion name
- Clicking a chat row opens the DM panel as a slide-in overlay
- Real-time updates: new messages bump conversations to the top via `dm:receive` socket event
- Aggregation pipeline on backend groups messages by conversation partner

### Persistent Notifications

- Bell icon in navbar with real-time unread badge
- **Stored in MongoDB** with a 10-day TTL — notifications survive page refreshes and logouts
- Three notification types:
  - `companion_request` — someone sent you a companion request
  - `companion_accepted` — your companion request was accepted
  - `room_invite` — a companion invited you to their study room (including missed invites when offline)
- Per-notification Read/Unread state — click to mark read, "Mark all read" bulk action
- Real-time push via `notification:new` socket event when online
- Fetched via `GET /notifications` on app load when offline delivery occurred
- Animated dropdown with relative timestamps, per-type icons, and inline delete

### AI Whiteboard

- **Full-page collaborative whiteboard** — opens as a dedicated route (`/whiteboard/:roomId`) when the Whiteboard tab is clicked in the call room. Full drawing tools (shapes, text, freehand, arrows, etc.) powered by `@excalidraw/excalidraw`
- **Completely free** — the whiteboard library is MIT-licensed and runs entirely client-side, AI analysis via Gemini free tier
- **Lazy-loaded** via `React.lazy()` — whiteboard bundle only downloads when first opened, keeping initial page load fast
- **Real-time collaboration** — all room participants see the same whiteboard live via Socket.IO
  - Drawing changes debounced at 200ms (client) and throttled at 100ms (server)
  - Echo-loop prevention ensures incoming sync doesn't re-trigger outgoing broadcasts
- **Built-in AI Assist sidebar** — collapsible right panel (360px, Framer Motion spring) with:
  - "Explain This" button to analyze the entire whiteboard
  - Custom question input to ask specific questions about the drawing
  - Q&A history with teal-accented chat bubbles and Framer Motion animations
- **Toolbar** — top bar with Back to Room, Clear whiteboard, Summary (generates + saves whiteboard summary to R2 + MongoDB), and AI Assist toggle
- **Smart AI payloads** — sends compact text descriptions (element type, text content, dimensions) rather than raw JSON

### Study Radio

- **Full-page radio player** at `/radio` — browse and play curated internet radio channels from SomaFM
- **8 curated channels** — Groove Salad, Drone Zone, Lush, Space Station Soma, DEF CON Radio, Boot Liquor, Fluid, Groove Salad Classic (ambient, chill, electronic, Americana)
- **Global audio context** — `RadioContext` with `useReducer`, manages `HTMLAudioElement` + Web Audio API `AnalyserNode` for real-time visualizations. State persisted to `sessionStorage`
- **Canvas-based audio visualizer** — frequency bar animation with fallback to CSS animated bars
- **Floating MiniPlayer** — bottom-right mini player visible on all pages except `/radio`. Play/pause, volume, mute, expand, and close controls
- **Accessible from sidebar** — "Study Radio" nav item with headphones icon

### Video Calling (Agora RTC)

- **Opt-in video calls** — Agora RTC only starts when the user clicks "Start Video Call" in the room lobby. Chat, AI, and whiteboard tools are available immediately without consuming Agora hours
- Agora App ID loaded from environment variable (`VITE_AGORA_APP_ID`)
- Multi-user video grid supporting up to 5 participants
- Camera toggle (on/off), microphone toggle (mute/unmute)
- End call button (red PhoneOff) in the video grid to leave the call without leaving the room
- Automatic remote user subscription

### Real-time Chat

- Live in-room messaging powered by Socket.IO
- Uses a singleton socket instance shared across all components
- Visual distinction between your messages, others' messages, and bot messages
- Bot welcome message on room join
- **Linkify helper** — URLs in bot messages render as clickable links (e.g., summary download links)
- Summary bot messages get special styling (violet background, rounded border) distinct from regular bot messages
- **Opt-in chat persistence** — chat messages are ephemeral by default (fresh every session). Users can save them to MongoDB on demand:
  - **Inline "Save" button** in the chat input bar — saves all messages to the database. Disabled when no unsaved messages exist; re-enables when new messages arrive after a save. Shows a brief "Saved" confirmation with checkmark
  - **"Save your chats?" exit prompt** — animated modal appears when leaving the room with unsaved messages. Options: "Save & Exit" (persists then navigates) or "Exit without saving" (discards). Prompt is **skipped entirely** if the user already saved all messages via the inline button
  - **Browser tab close protection** — native `beforeunload` dialog warns when unsaved messages exist
  - **React Router navigation blocking** — `useBlocker` intercepts sidebar/back button navigation and shows the save prompt
  - Messages are bulk-saved via `POST /chat/bulk-save` with a `sessionId` (UUID) grouping messages per save operation. Capped at 500 messages per request
  - Bot messages are excluded from saves and unsaved message counts

### AI Doubt Solver

- In-room AI panel accessible via the "AI Doubt" tab in the room lobby (no video call required)
- Switchable AI provider via `AI_PROVIDER` env variable:
  - **Gemini 2.5 Flash** (default) — Google's free tier (250 requests/day, resets daily)
  - **Grok 3 Mini** — xAI's API (fallback option)
- Both providers use the OpenAI-compatible SDK — no code changes needed to switch
- Text input with full conversation history
- Voice input via Web Speech API (browser mic button)
- Styled Q&A cards with generic "AI Assistant" branding
- **Full dark mode support** — input field, Q&A bubbles, loading indicators, mic button, and all backgrounds properly themed

### Summaries

- **Dedicated Summaries page** at `/summaries` accessible from sidebar ("Summaries" nav item)
- **Three sub-tabs:** Room Chat, DM Chat, Whiteboard — each shows persistent summaries filtered by type
- Summaries stored in **MongoDB** (`Summary` model) alongside Cloudflare R2 HTML uploads
- Summary cards with type badge, title, date, expandable content, and delete button (with ownership check)
- **Generate summary buttons** placed contextually throughout the app:
  - **Room chat:** Summary button in bottom action bar of RoomCallPage (visible only on Chat tab, disabled when no user messages)
  - **Whiteboard:** Summary button in WhiteboardPage toolbar (between Clear and AI Assist)
  - **DM:** Summary icon button (FileText) in DmPanel header
- All use shared `generateAndSaveSummary()` utility for consistent generate-then-save flow
- **DM Summary** — `POST /ai/dm-summary` fetches up to 100 DMs between user and companion, formats as chat transcript, generates AI summary
- **Save to Cloudflare R2** — uploads summary as styled HTML document to R2 (S3-compatible storage)
  - Generates a presigned download URL valid for 7 days
  - After saving, a VSG Bot message is broadcast to the room chat with the download link
  - **Monthly upload quota:** configurable via `R2_MAX_UPLOADS_PER_MONTH` env var (default: 10 per user)
- **RAG-powered Q&A** — ask natural language questions across all saved summaries (e.g., "What did we discuss about React?", "What topics this week?")
  - Proper **vector embeddings** using Gemini `text-embedding-004` (768-dim, free tier)
  - Summaries are embedded at save time, stored as vectors in MongoDB
  - At query time: question is embedded, cosine similarity finds the top 5 most relevant summaries, which are passed as context to Gemini 2.5 Flash for answering
  - AI answers cite which summary and date the information comes from
  - **Collapsible Q&A panel** on the Summaries page with suggestion chips, loading states, and source citation badges
  - **Three-layer rate limiting** to protect the free tier:
    - Per-user: `SUMMARY_QA_MAX_PER_USER` (default 10) per `SUMMARY_QA_WINDOW_MIN` (default 15 min)
    - Global daily: `EMBEDDING_DAILY_MAX` (default 400) embedding API calls/day across all users, tracked via `EmbeddingCounter` collection
    - Save-time embeddings naturally limited by existing R2 upload quota
  - **Backfill script** (`backend/src/scripts/backfillEmbeddings.ts`) for generating embeddings on existing summaries
  - **[Full technical documentation with flowcharts](SEMANTIC_QA_DOCUMENTATION.md)** — detailed step-by-step breakdown of the entire RAG pipeline, summary generation flows, embedding mechanics, cosine similarity, and rate limiting architecture

### Home Page

- Instagram-style companion presence bar with online/offline indicators
- "Let's Study Together" gradient CTA card
- Inshorts-style news feed with mock AI/Tech/Productivity articles
- Category filter chips (All / AI / Tech / Productivity)
- Animated card layout with accent color badges

### Navigation

- Collapsible sidebar (not a top bar) with framer-motion spring animation
- Hamburger toggle at top-left
- Sidebar items: Home, Chats, Summaries, My Room, Study Radio, Streaming, Ask AI, Contact us
- "My Room" menu item dispatches room entry and navigates to call
- Profile avatar dropdown (shows emoji avatar when set, initials otherwise) with: My Profile, Settings, My Room, Ask AI, Logout
- Active route highlighting

### Live Streaming (YouTube)

- Camera preview with device controls
- FFmpeg child process for RTMP streaming
- YouTube Live stream key integration
- H264/AAC encoding pipeline

### Rate Limiting & Security

- **All rate limit thresholds configurable via env vars** — every value in `RATE_LIMIT_CONFIG` reads from a corresponding env var with sensible defaults. No code changes needed to tune limits
- **Dual-layer protection on auth endpoints** — both per-email and per-IP limits applied simultaneously:
  - Login & Register: `AUTH_MAX_PER_EMAIL` (default 7) / `AUTH_MAX_PER_IP` (default 15) per `AUTH_WINDOW_MIN` (default 15 min)
  - Send OTP: `OTP_MAX_PER_EMAIL` (default 5) / `OTP_MAX_PER_IP` (default 7) per `OTP_WINDOW_MIN` (default 15 min)
- **Per-userId rate limiting on authenticated endpoints:**
  - AI Doubt Solver & Session Summary: `AI_MAX_PER_USER` (default 20) per `AI_WINDOW_MIN` (default 15 min)
  - Summary Q&A: `SUMMARY_QA_MAX_PER_USER` (default 10) per `SUMMARY_QA_WINDOW_MIN` (default 15 min) — tighter limit since each Q&A call makes both an embedding call and a chat completion call
  - User Search: `SEARCH_MAX_PER_USER` (default 30) per `SEARCH_WINDOW_MIN` (default 1 min)
- **R2 summary upload quota:** `R2_MAX_UPLOADS_PER_MONTH` (default 10) per user per calendar month, tracked via MongoDB `UploadCounter` collection
- **Embedding daily cap:** `EMBEDDING_DAILY_MAX` (default 400) embedding API calls per day across all users, tracked via MongoDB `EmbeddingCounter` collection. Protects Gemini free tier (~1,500 RPD for embeddings)
- **Global safety net:** `GLOBAL_MAX_PER_IP` (default 200) per `GLOBAL_WINDOW_MIN` (default 15 min) across all routes
- **Socket event throttling** (per-user, in-memory, configurable via env):
  - `dm:send`: `SOCKET_DM_INTERVAL_MS` (default 200ms)
  - `companion:sendRequest`: `SOCKET_COMPANION_REQ_INTERVAL_MS` (default 5000ms)
  - `sendInvite`: `SOCKET_INVITE_INTERVAL_MS` (default 3000ms)
- Throttled socket events emit error responses (`dm:error`, `companion:error`, `inviteError`)
- HTTP 429 responses include `RateLimit-*` standard headers
- `trust proxy` enabled for correct client IP detection behind reverse proxies

### UI/UX

- Animated components with Framer Motion throughout
- Responsive design with Tailwind CSS
- Reusable shadcn/ui components (Button, Card, Input, Label, Select)
- Overlay notifications for invites and companion requests
- Toast feedback for invite sent/error states

## Coming Soon

- Screen sharing in video calls
- Full streaming pipeline (frontend-to-backend wiring)
- Session analytics dashboard
- Study streak tracking
- Whiteboard image export to AI (Gemini Vision) for richer spatial analysis

## Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB instance (local or Atlas)
- Agora account (for video call App ID)
- Google Cloud Console OAuth Client ID (for Google sign-in — [create one](https://console.cloud.google.com/apis/credentials))
- Google AI Studio API key (for Gemini AI — [get one free](https://aistudio.google.com)) or xAI API key (for Grok — [get one free](https://console.x.ai))
- Cloudflare account with R2 bucket + API token (for summary storage — [free tier](https://developers.cloudflare.com/r2/))

### Quick Start (Monorepo)

Install all dependencies from the root:

```bash
npm run install:all
```

Start the frontend or backend individually from the root:

```bash
npm run dev:frontend   # Starts Vite dev server
npm run dev:backend    # Starts Express + Socket.IO
```

### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in `backend/` with:

```
MONGODB_URI=your_mongodb_connection_string
PORT=7002
JWT_SECRET=your_jwt_secret
AI_PROVIDER=gemini                # "gemini" (default) or "grok"
GEMINI_API_KEY=your_gemini_key    # from https://aistudio.google.com
GEMINI_EMBEDDING_MODEL=text-embedding-004  # Embedding model for RAG Q&A (default: text-embedding-004)
GROK_API_KEY=your_xai_api_key     # from https://console.x.ai (optional, for grok provider)
R2_ACCOUNT_ID=your_cloudflare_id  # Cloudflare account ID (from dashboard URL)
R2_ACCESS_KEY_ID=your_r2_key      # R2 API token access key
R2_SECRET_ACCESS_KEY=your_r2_secret # R2 API token secret key
R2_BUCKET_NAME=study-summaries    # R2 bucket name for saved summaries
R2_MAX_UPLOADS_PER_MONTH=10      # Max summary uploads per user per month (default: 10)
AGORA_APP_ID=your_agora_app_id   # Agora RTC App ID
SMTP_HOST=smtp.gmail.com          # SMTP server for OTP emails
SMTP_PORT=587                     # SMTP port (587 for TLS)
SMTP_USER=your-email@gmail.com    # SMTP sender email
SMTP_PASS=your-app-password       # SMTP password (Gmail: use App Password)
OTP_SECRET=your-random-hex-string # HMAC signing key for stateless OTP
OTP_EXPIRY_MINUTES=5              # OTP validity duration (default: 5 minutes)

# Rate Limiting (all optional — defaults shown, only override what you need)
# AUTH_WINDOW_MIN=15              # Auth window in minutes
# AUTH_MAX_PER_EMAIL=7            # Max login/register per email per window
# AUTH_MAX_PER_IP=15              # Max login/register per IP per window
# OTP_WINDOW_MIN=15              # OTP send window in minutes
# OTP_MAX_PER_EMAIL=5            # Max OTP sends per email per window
# OTP_MAX_PER_IP=7               # Max OTP sends per IP per window
# AI_WINDOW_MIN=15               # AI endpoint window in minutes
# AI_MAX_PER_USER=20             # Max AI requests per user per window
# SEARCH_WINDOW_MIN=1            # User search window in minutes
# SEARCH_MAX_PER_USER=30         # Max searches per user per window
# GLOBAL_WINDOW_MIN=15           # Global safety net window in minutes
# GLOBAL_MAX_PER_IP=200          # Max requests per IP per window (all routes)
# SUMMARY_QA_WINDOW_MIN=15       # Summary Q&A window in minutes
# SUMMARY_QA_MAX_PER_USER=10     # Max Q&A questions per user per window
# EMBEDDING_DAILY_MAX=400        # Max embedding API calls per day (global, all users)
# SOCKET_DM_INTERVAL_MS=200      # Min ms between DM sends per user
# SOCKET_COMPANION_REQ_INTERVAL_MS=5000  # Min ms between companion requests
# SOCKET_INVITE_INTERVAL_MS=3000 # Min ms between room invites
```

Start the server:

```bash
npm start
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Create a `.env` file in `frontend/` with:

```
VITE_API_URL=http://localhost:7002
VITE_AGORA_APP_ID=your_agora_app_id   # Agora RTC App ID
VITE_GOOGLE_CLIENT_ID=your_google_client_id # Google OAuth Client ID (from https://console.cloud.google.com)
```

## Routes

| Path         | Page            | Auth Required |
| ------------ | --------------- | :-----------: |
| `/`          | Landing Page    |      No       |
| `/login`     | Login           |      No       |
| `/register`  | Register        |      No       |
| `/home`      | Room Dashboard  |      Yes      |
| `/profile`   | User Profile    |      Yes      |
| `/settings`  | Settings        |      Yes      |
| `/chats`     | Recent Chats    |      Yes      |
| `/summaries` | Summaries       |      Yes      |
| `/room/call` | Video Call Room |      Yes      |
| `/join/:roomId` | Join Room via Invite Link | No (redirects to login) |
| `/whiteboard/:roomId` | Collaborative Whiteboard |  Yes  |
| `/radio`     | Study Radio     |      Yes      |
| `/stream`    | Live Streaming  |      Yes      |
| `/ask`       | Ask AI (Voice)  |      Yes      |

## API Endpoints

| Method | Endpoint                  | Description                                                          |
| ------ | ------------------------- | -------------------------------------------------------------------- |
| POST   | `/auth/send-otp`          | Send 6-digit OTP to email (rate limited: per-email + per-IP)         |
| POST   | `/auth/register`          | Verify OTP and register new user (rate limited: per-email + per-IP)  |
| POST   | `/auth/login`             | Verify OTP and login (rate limited: per-email + per-IP)              |
| POST   | `/auth/google`            | Google OAuth sign-in/register (rate limited: per-IP)                 |
| POST   | `/companion/request`      | Send companion request                                               |
| POST   | `/companion/accept`       | Accept companion request                                             |
| POST   | `/companion/decline`      | Decline companion request                                            |
| GET    | `/companion/list`         | Get accepted companions                                              |
| GET    | `/companion/pending`      | Get pending requests                                                 |
| GET    | `/user/profile`           | Get authenticated user's profile (name, email, bio, companion count) |
| PUT    | `/user/profile`           | Update profile (name, bio, avatar) — re-issues JWT                   |
| GET    | `/user/search?q=`         | Search users by name/email (rate limited: per-user)                  |
| GET    | `/news`                   | Get news feed articles                                               |
| POST   | `/ai/ask`                 | Ask AI a study question (rate limited: per-user)                     |
| POST   | `/ai/summary`             | Generate AI chat session summary (rate limited: per-user)            |
| POST   | `/ai/whiteboard-explain`  | AI analysis of whiteboard drawing (rate limited: per-user)           |
| POST   | `/ai/whiteboard-summary`  | Generate AI whiteboard summary (rate limited: per-user)              |
| POST   | `/ai/save-summary`        | Save summary to Cloudflare R2 + MongoDB, broadcast link to room chat |
| POST   | `/ai/dm-summary`          | Generate AI summary of DM conversation with a companion              |
| POST   | `/ai/summary-qa`          | RAG Q&A: ask questions across saved summaries (rate limited: per-user + daily embedding cap) |
| GET    | `/ai/summaries`           | List saved summaries (filter by `?type=room\|dm\|whiteboard`)        |
| DELETE | `/ai/summaries/:id`       | Delete a saved summary (ownership check)                             |
| POST   | `/chat/bulk-save`         | Bulk-save room chat messages to MongoDB (auth required, max 500)     |
| GET    | `/dm/recent`              | Get recent chats (last message per companion, sorted by time)        |
| GET    | `/dm/:companionId`        | Get DM history (includes `_id`, `read` state)                        |
| GET    | `/dm/unread-counts`       | Get unread message count per companion                               |
| PATCH  | `/dm/:companionId/read`   | Mark all messages from companion as read                             |
| GET    | `/notifications`          | Get all notifications (last 50, newest first)                        |
| PATCH  | `/notifications/:id/read` | Mark a notification as read                                          |
| PATCH  | `/notifications/read-all` | Mark all notifications as read                                       |
| DELETE | `/notifications/:id`      | Delete a notification                                                |

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).
