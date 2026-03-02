# Virtual Study Group

A full-stack web application for creating virtual study group spaces with real-time video conferencing, live chat, AI-powered doubt solving, companion messaging, and collaborative study tools.

## Tech Stack

| Layer                | Technology                             |
| -------------------- | -------------------------------------- |
| **Backend**          | Node.js, Express, TypeScript           |
| **Frontend**         | React 18, TypeScript, Vite             |
| **Database**         | MongoDB (Mongoose)                     |
| **Real-time**        | Socket.IO                              |
| **Video Calls**      | Agora RTC SDK                          |
| **AI**               | xAI Grok API (grok-3-mini)            |
| **State Management** | Redux Toolkit                          |
| **Styling**          | Tailwind CSS, shadcn/ui, Framer Motion |
| **Auth**             | JWT + bcrypt                           |
| **Streaming**        | FFmpeg (RTMP to YouTube Live)          |
| **Audio Viz**        | P5.js                                  |
| **News Feed**        | Mock articles (AI / Tech / Productivity categories, 30-min cache) |

## Features

### Authentication

- User registration with secure password hashing (bcrypt)
- Login with JWT token-based authentication
- Protected routes for authenticated users
- Persistent auth state via Redux + localStorage
- JWT rehydration on page refresh (no re-login needed)

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
- Multi-user video grid supporting up to 5 participants
- Camera toggle (on/off)
- Microphone toggle (mute/unmute)
- Automatic remote user subscription

### Real-time Chat

- Live in-room messaging powered by Socket.IO
- Uses a singleton socket instance shared across all components
- Visual distinction between your messages, others' messages, and bot messages
- Bot welcome message on room join

### AI Doubt Solver (Grok)

- In-room AI panel accessible via the "AI Doubt" tab during calls
- Powered by xAI Grok API (`grok-3-mini` model)
- Text input with full conversation history
- Voice input via Web Speech API (browser mic button)
- Styled Q&A cards with Grok branding

### Session Summary (Grok)

- "Summary" tab in the call room generates an AI summary of the chat session
- Sends all chat messages to Grok for analysis
- One-click generation with loading state
- Formatted summary card display

### Home Page

- Instagram-style companion presence bar with online/offline indicators
- "Let's Study Together" gradient CTA card
- Inshorts-style news feed with mock AI/Tech/Productivity articles
- Category filter chips (All / AI / Tech / Productivity)
- Animated card layout with accent color badges

### Navigation

- Collapsible sidebar (not a top bar) with framer-motion spring animation
- Hamburger toggle at top-left
- "My Room" menu item dispatches room entry and navigates to call
- Active route highlighting

### Live Streaming (YouTube)

- Camera preview with device controls
- FFmpeg child process for RTMP streaming
- YouTube Live stream key integration
- H264/AAC encoding pipeline

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
- xAI API key (for Grok AI features — [get one free](https://console.x.ai))

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
GROK_API_KEY=your_xai_api_key
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
```

## Routes

| Path         | Page            | Auth Required |
| ------------ | --------------- | :-----------: |
| `/`          | Landing Page    |      No       |
| `/login`     | Login           |      No       |
| `/register`  | Register        |      No       |
| `/home`      | Room Dashboard  |      Yes      |
| `/room/call` | Video Call Room |      Yes      |
| `/stream`    | Live Streaming  |      Yes      |
| `/ask`       | Ask AI (Voice)  |      Yes      |

## API Endpoints

| Method | Endpoint               | Description                  |
| ------ | ---------------------- | ---------------------------- |
| POST   | `/auth/register`       | Register a new user          |
| POST   | `/auth/login`          | Login and receive JWT        |
| POST   | `/companion/request`   | Send companion request       |
| POST   | `/companion/accept`    | Accept companion request     |
| POST   | `/companion/decline`   | Decline companion request    |
| GET    | `/companion/list`      | Get accepted companions      |
| GET    | `/companion/pending`   | Get pending requests         |
| GET    | `/user/search?q=`     | Search users by name/email   |
| GET    | `/news`                | Get news feed articles       |
| POST   | `/ai/ask`              | Ask Grok a study question    |
| POST   | `/ai/summary`          | Generate session summary     |
| GET    | `/dm/:companionId`          | Get DM history (includes `_id`, `read` state) |
| GET    | `/dm/unread-counts`         | Get unread message count per companion         |
| PATCH  | `/dm/:companionId/read`     | Mark all messages from companion as read       |
| GET    | `/notifications`            | Get all notifications (last 50, newest first)  |
| PATCH  | `/notifications/:id/read`   | Mark a notification as read                    |
| PATCH  | `/notifications/read-all`   | Mark all notifications as read                 |
| DELETE | `/notifications/:id`        | Delete a notification                          |

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).
