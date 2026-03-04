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
| **Cloud Storage**    | Cloudflare R2 (S3-compatible, free tier) for summary persistence  |
| **State Management** | Redux Toolkit                                                     |
| **Styling**          | Tailwind CSS, shadcn/ui, Framer Motion                            |
| **Auth**             | Stateless OTP (HMAC-SHA256) + JWT + nodemailer                    |
| **Rate Limiting**    | express-rate-limit (per-user + per-IP, all thresholds via env vars) |
| **Streaming**        | FFmpeg (RTMP to YouTube Live)                                     |
| **Audio Viz**        | P5.js                                                             |
| **News Feed**        | Mock articles (AI / Tech / Productivity categories, 30-min cache) |

## Features

### Authentication (OTP-based)

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
- Only study companions can invite each other to rooms
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
- Gradient banner with large initials-based avatar, name, and "Student" label
- Editable name and bio with inline edit/save mode
- Stats row showing companion count and email
- Profile updates re-issue JWT and sync Redux state instantly
- Extended User model with `bio` and `avatar` fields

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

### Video Calling (Agora RTC)

- Real-time video and audio calls using Agora SDK
- Agora App ID loaded from environment variable (`VITE_AGORA_APP_ID`) — no longer hardcoded
- Multi-user video grid supporting up to 5 participants
- Camera toggle (on/off)
- Microphone toggle (mute/unmute)
- Automatic remote user subscription

### Real-time Chat

- Live in-room messaging powered by Socket.IO
- Uses a singleton socket instance shared across all components
- Visual distinction between your messages, others' messages, and bot messages
- Bot welcome message on room join
- **Linkify helper** — URLs in bot messages render as clickable links (e.g., summary download links)
- Summary bot messages get special styling (violet background, rounded border) distinct from regular bot messages

### AI Doubt Solver

- In-room AI panel accessible via the "AI Doubt" tab during calls
- Switchable AI provider via `AI_PROVIDER` env variable:
  - **Gemini 2.5 Flash** (default) — Google's free tier (250 requests/day, resets daily)
  - **Grok 3 Mini** — xAI's API (fallback option)
- Both providers use the OpenAI-compatible SDK — no code changes needed to switch
- Text input with full conversation history
- Voice input via Web Speech API (browser mic button)
- Styled Q&A cards with generic "AI Assistant" branding

### Session Summary

- "Summary" tab in the call room generates an AI summary of the chat session
- Uses the same switchable AI provider as the Doubt Solver
- One-click generation with loading state
- Formatted summary card display
- **Save to Cloudflare R2** — "Save Summary" button uploads the summary as a beautifully styled HTML document to Cloudflare R2 (S3-compatible storage)
  - Generates a presigned download URL valid for 7 days
  - After saving, a **VSG Bot message** is broadcast to the room chat with the download link so all call participants can access it
  - Saved summaries include: session date, user name, room ID, and formatted bullet-point content
  - Button transitions to a green "Saved! View Summary" link after successful upload
  - Re-generating a new summary resets the save state
  - **Monthly upload quota:** configurable via `R2_MAX_UPLOADS_PER_MONTH` env var (default: 10 per user). Tracked per calendar month in MongoDB

### Home Page

- Instagram-style companion presence bar with online/offline indicators
- "Let's Study Together" gradient CTA card
- Inshorts-style news feed with mock AI/Tech/Productivity articles
- Category filter chips (All / AI / Tech / Productivity)
- Animated card layout with accent color badges

### Navigation

- Collapsible sidebar (not a top bar) with framer-motion spring animation
- Hamburger toggle at top-left
- Sidebar items: Home, Chats, My Room, Streaming, Ask AI, Contact us
- "My Room" menu item dispatches room entry and navigates to call
- Profile avatar dropdown with: My Profile, Settings, My Room, Ask AI, Logout
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
  - User Search: `SEARCH_MAX_PER_USER` (default 30) per `SEARCH_WINDOW_MIN` (default 1 min)
- **R2 summary upload quota:** `R2_MAX_UPLOADS_PER_MONTH` (default 10) per user per calendar month, tracked via MongoDB `UploadCounter` collection
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

## Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB instance (local or Atlas)
- Agora account (for video call App ID)
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
```

## Routes

| Path         | Page            | Auth Required |
| ------------ | --------------- | :-----------: |
| `/`          | Landing Page    |      No       |
| `/login`     | Login           |      No       |
| `/register`  | Register        |      No       |
| `/home`      | Room Dashboard  |      Yes      |
| `/profile`   | User Profile    |      Yes      |
| `/chats`     | Recent Chats    |      Yes      |
| `/room/call` | Video Call Room |      Yes      |
| `/stream`    | Live Streaming  |      Yes      |
| `/ask`       | Ask AI (Voice)  |      Yes      |

## API Endpoints

| Method | Endpoint                  | Description                                                          |
| ------ | ------------------------- | -------------------------------------------------------------------- |
| POST   | `/auth/send-otp`          | Send 6-digit OTP to email (rate limited: per-email + per-IP)         |
| POST   | `/auth/register`          | Verify OTP and register new user (rate limited: per-email + per-IP)  |
| POST   | `/auth/login`             | Verify OTP and login (rate limited: per-email + per-IP)              |
| POST   | `/companion/request`      | Send companion request                                               |
| POST   | `/companion/accept`       | Accept companion request                                             |
| POST   | `/companion/decline`      | Decline companion request                                            |
| GET    | `/companion/list`         | Get accepted companions                                              |
| GET    | `/companion/pending`      | Get pending requests                                                 |
| GET    | `/user/profile`           | Get authenticated user's profile (name, email, bio, companion count) |
| PUT    | `/user/profile`           | Update profile (name, bio) — re-issues JWT                           |
| GET    | `/user/search?q=`         | Search users by name/email (rate limited: per-user)                  |
| GET    | `/news`                   | Get news feed articles                                               |
| POST   | `/ai/ask`                 | Ask AI a study question (rate limited: per-user)                     |
| POST   | `/ai/summary`             | Generate AI session summary (rate limited: per-user)                 |
| POST   | `/ai/save-summary`        | Save summary to Cloudflare R2, broadcast link to room chat           |
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
