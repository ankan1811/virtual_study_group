# Virtual Study Group

A full-stack web application for creating virtual study group spaces with real-time video conferencing, live chat, streaming, and AI-powered study tools.

## Tech Stack

| Layer                | Technology                             |
| -------------------- | -------------------------------------- |
| **Backend**          | Node.js, Express, TypeScript           |
| **Frontend**         | React 18, TypeScript, Vite             |
| **Database**         | MongoDB (Mongoose)                     |
| **Real-time**        | Socket.IO                              |
| **Video Calls**      | Agora RTC SDK                          |
| **State Management** | Redux Toolkit                          |
| **Styling**          | Tailwind CSS, shadcn/ui, Framer Motion |
| **Auth**             | JWT + bcrypt                           |
| **Streaming**        | FFmpeg (RTMP to YouTube Live)          |
| **Audio Viz**        | P5.js                                  |

## Features

### Authentication

- User registration with secure password hashing (bcrypt)
- Login with JWT token-based authentication
- Protected routes for authenticated users
- Persistent auth state via Redux + localStorage

### Room Management

- Create new study rooms
- Join existing rooms by room ID (private rooms)
- View all users in a room
- Room-based isolation for chat and calls

### Video Calling (Agora RTC)

- Real-time video and audio calls using Agora SDK
- Multi-user video grid supporting up to 5 participants
- Camera toggle (on/off)
- Microphone toggle (mute/unmute)
- Automatic remote user subscription

### Real-time Chat

- Live in-room messaging powered by Socket.IO
- Chat history persisted in MongoDB
- Visual distinction between your messages, others' messages, and bot messages
- Bot welcome message on room join

### Live Streaming (YouTube)

- Camera preview with device controls
- FFmpeg child process for RTMP streaming
- YouTube Live stream key integration
- H264/AAC encoding pipeline

### AI Voice Interface (Skeleton)

- Ask AI page with microphone input
- P5.js real-time audio level visualization
- Audio recording via MediaRecorder API
- Blob-based audio upload flow

### UI/UX

- Animated landing page with Framer Motion
- Responsive design with Tailwind CSS
- Reusable shadcn/ui components (Button, Card, Input, Label, Select)
- Dedicated navbars for general navigation and in-call view

## Coming Soon

### AI Auto Session Summary

- End-of-session prompt asking what you studied
- AI-generated bullet-point summary of the session
- Key concepts extraction from session + chat history
- Follow-up tasks and action items
- Auto-generated quiz questions for revision
- Persistent study log and revision bank in MongoDB

### Live Doubt Solver

- In-call doubt input during video sessions
- AI-powered concept explanations with examples
- Visual explanations and practice problem generation
- Context-aware responses with difficulty levels:
  - "Explain like I'm preparing for CAT"
  - "Explain for MiM interview level"

### Planned Improvements

- Screen sharing in video calls
- Random room matching logic
- Full streaming pipeline (frontend-to-backend wiring)
- Session analytics dashboard
- Study streak tracking

## Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB instance (local or Atlas)
- Agora account (for video call App ID)

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
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

Start the server:

```bash
npm start
```

Configure ports via `backend/.env` (`PORT`) and `frontend/.env` (`VITE_API_URL`, `VITE_STREAM_SOCKET_URL`).

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
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
| `/demo`      | AI Demo         |      Yes      |

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).
