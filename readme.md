# Virtual Study Group

A full-stack web application for creating virtual study group spaces with real-time video conferencing, live chat, AI-powered doubt solving, companion messaging, and collaborative study tools.

## Tech Stack

| Layer                | Technology                                                        |
| -------------------- | ----------------------------------------------------------------- |
| **Backend**          | Node.js, Express, TypeScript                                      |
| **Frontend**         | React 18, TypeScript, Vite                                        |
| **Database**         | PostgreSQL via NeonDB + Drizzle ORM (structured data) · MongoDB (Mongoose) for unstructured/AI data · Upstash Redis (TTL cache + rate limiting) |
| **Real-time**        | Socket.IO                                                         |
| **Video Calls**      | Agora RTC SDK                                                     |
| **AI**               | Switchable: Google Gemini 2.5 Flash (default) / xAI Grok          |
| **RAG / Embeddings** | Gemini `text-embedding-004` (768-dim vectors, free tier)          |
| **Cloud Storage**    | Cloudflare R2 (S3-compatible, free tier) for summary persistence  |
| **State Management** | Redux Toolkit                                                     |
| **Whiteboard**       | @excalidraw/excalidraw (MIT, client-side, lazy-loaded)            |
| **Study Radio**      | SomaFM internet radio streams (ambient/chill/electronic)          |
| **Podcasts**         | Listen Notes API (300 free calls/month) — curated across 5 topics, Upstash Redis cache (TTL 4 days), node-cron bi-weekly refresh |
| **Styling**          | Tailwind CSS, shadcn/ui, Framer Motion                            |
| **Auth**             | Redis-backed OTP (HMAC-SHA256 + Upstash Redis TTL) + Google OAuth + JWT + Resend (email delivery) |
| **Rate Limiting**    | @upstash/ratelimit (sliding window, Redis-backed, per-user + per-IP, all thresholds via env vars) |
| **Caching**          | Upstash Redis (OTP hashes with TTL auto-expiry, podcast cache with 4-day TTL, distributed rate limit counters) |
| **News Feed**        | Mock articles (AI / Tech / Productivity categories, 30-min cache) |

## Database Architecture

This project uses a **triple-layer data architecture** — PostgreSQL for structured relational data, MongoDB for unstructured/flexible data, and Upstash Redis for TTL-based caching and transient data.

### PostgreSQL (NeonDB + Drizzle ORM) — structured data

Structured entities with clear relationships live in **NeonDB** via **Drizzle ORM**:

| Table | Purpose | Why PostgreSQL |
|---|---|---|
| `users` | User profiles (name, email, avatar, education, projects, work experience) | Relational core — referenced by every other table via FK |
| `rooms` / `room_members` | Study rooms and membership | Many-to-many join with FK cascades |
| `companions` | Friend/companion relationships with status | Unique constraint on (requester, recipient), status enum, bidirectional queries |
| `notifications` | Persistent notifications (10-day retention) | Must survive page refreshes and logouts, queryable by recipient + read state |
| `direct_messages` | DM history between users | Relational (from/to FKs), complex aggregations (unread counts, recent conversations) |
| `chats` | Room chat messages | Indexed by (roomId, createdAt) for session replay |
| `upload_counters` | Monthly R2 upload quota per user | **Deliberately kept in Postgres over Redis** — protects a real cost boundary (Cloudflare R2 storage). Must survive for 31 days without risk of eviction. A Redis flush would reset counters to zero, giving users free uploads beyond quota. Low frequency (~2-5 writes/session) means Postgres speed is fine. Enables historical audit queries ("which users hit the limit?") |

- Type-safe schema with foreign key constraints and enums
- UUID primary keys — preserves the existing string-based auth contract (JWTs, socket IDs, DM room keys)
- `ON CONFLICT DO UPDATE` atomic upserts for counter tables
- SQL window functions for complex DM aggregations

### MongoDB (Mongoose) — unstructured/flexible data

One collection stays in MongoDB where the flexible document model is a genuine advantage:

| Collection | Why MongoDB |
|---|---|
| `summaries` | Variable-length HTML content (5KB–50KB+), 768-dim embedding arrays stored natively, schema varies by type (room/DM/whiteboard), RAG cosine-similarity queries done in Node.js |

### Upstash Redis — TTL cache + transient data

Redis handles all data that benefits from automatic expiration or needs to be fast and ephemeral:

| Use Case | Key Pattern | TTL | Why Redis |
|---|---|---|---|
| **OTP hashes** | `otp:{email}` | 5 min (configurable via `OTP_EXPIRY_MINUTES`) | Auto-expire eliminates stale OTPs, one active OTP per email enforced by key overwrite, server-side only (no hash/expires sent to frontend) |
| **Podcast cache** | `podcast:{topic}` | 4 days (345,600s) | Fast key-value reads, automatic TTL cleanup (replaced MongoDB `Podcast` model), cache validity checked against last Tue/Sat boundary |
| **Rate limit counters** | `rl:{limiter}:{key}` | Per-window (varies) | Distributed sliding window via `@upstash/ratelimit`, works across multiple server instances, fail-open on Redis downtime |
| **Embedding daily cap** | `embeddings:{YYYY-MM-DD}` | 24 hours | Global counter across all users, high-frequency (every summary save + every RAG query), auto-expires at end of day |

REST-based Upstash client — no TCP connection pools, fully serverless-friendly. Single `getRedis()` singleton initialized at startup (`backend/src/db/redis.ts`).

### Storage Decision Matrix — PostgreSQL vs Redis

This project stores counters, caches, and transient data across two stores. The decision of *where* each piece of data lives is deliberate, not arbitrary. Here's the framework:

#### The Core Question

> **"What happens if this data disappears?"**

If the answer is "a user gets free extra access" or "a security boundary weakens" — it belongs in **PostgreSQL**. If the answer is "we make one extra API call" or "a counter resets early" — **Redis** is fine.

#### Decision Framework

| Factor | PostgreSQL (NeonDB) | Redis (Upstash) |
|---|---|---|
| **Durability guarantee** | ACID transactions, WAL, replicated | Best-effort — eviction policies, no WAL, data can be lost on flush/restart |
| **Query complexity** | JOINs, aggregations, window functions, `GROUP BY` | Key-value only — `GET`, `SET`, `INCR`, no relational queries |
| **Access pattern** | Moderate frequency (dozens/sec) | High frequency (hundreds–thousands/sec) |
| **Data lifespan** | Permanent or long-lived (weeks–months–forever) | Short-lived (minutes–hours–days) |
| **Auto-expiration needed?** | No native TTL — requires cron jobs | Built-in TTL per key — set-and-forget |
| **Auditability** | Full SQL queries, historical analysis, `GROUP BY` over time | No history — once a key expires, the data is gone |
| **Cost of data loss** | High — users exceed limits, security boundaries break | Low — at worst, a counter resets early or a cache refetches |
| **Atomic operations** | `INSERT ... ON CONFLICT DO UPDATE` (upsert) | `INCR`, `SETNX`, `EXPIRE` — all atomic, all O(1) |
| **Multi-instance safe?** | Yes (single database) | Yes (centralized Redis, not in-memory per-process) |

#### What Lives Where — and Why

##### PostgreSQL: `upload_counters` (monthly R2 upload quota)

```
Key:     (userId, monthKey)     e.g. ("abc-123", "2026-03")
Resets:  Monthly (calendar month boundary)
Limit:   R2_MAX_UPLOADS_PER_MONTH (default: 10)
```

**Why Postgres, not Redis?**

- **Durability matters.** Each upload costs real money (Cloudflare R2 storage + egress). If Redis evicts the key or flushes, the user's counter resets to zero and they get free uploads beyond their quota. With Postgres, the counter survives server restarts, Redis outages, and accidental flushes.
- **Long lifespan.** The counter must persist for an entire calendar month (up to 31 days). Redis TTLs work best for hours-to-days — a 31-day TTL is fragile because any Redis maintenance window could wipe it.
- **Low frequency.** This counter is only incremented when a user saves a summary to R2 — maybe 2-5 times per study session. Postgres handles this trivially; there's no performance reason to use Redis.
- **Auditability.** With Postgres, you can query historical upload patterns: "Which users are hitting the limit?", "Should we increase the quota?", "What's the average uploads/month?" With Redis, once the key expires, the data is gone forever.

**The risk of Redis here:** A user with 9/10 uploads used has their Redis key evicted. They now appear to have 0/10 used, getting 10 more free uploads. Over a month, this could mean 2-3x the intended R2 storage costs with no audit trail.

##### Redis: `embeddings:{dateKey}` (daily Gemini API cap)

```
Key:     embeddings:2026-03-25
Resets:  Daily (24-hour TTL)
Limit:   EMBEDDING_DAILY_MAX (default: 400)
```

**Why Redis, not Postgres?**

- **High frequency.** Every summary save *and* every RAG Q&A query calls `generateEmbedding()`, which increments this counter. During active study sessions with multiple users, this can fire dozens of times per minute. Redis `INCR` is O(1) with sub-millisecond latency; a Postgres upsert adds ~5-15ms of network round-trip to NeonDB per call.
- **Short lifespan.** The counter resets every 24 hours. Redis TTL handles this perfectly — `EXPIRE key 86400` and the key auto-deletes at end of day. No cron job needed.
- **Low cost of loss.** If the Redis key disappears mid-day, the counter resets to zero. Worst case: users get an extra ~400 embedding calls that day. Since Gemini's free tier allows ~1,500 RPD for embeddings, this temporary overshoot won't cause billing charges or API blocks — it's a soft budget, not a hard security boundary.
- **No audit value.** "How many embeddings did we use on March 12th?" is not a useful business question. The daily cap exists purely to prevent accidental free-tier exhaustion, not to track usage patterns.

**The tradeoff accepted:** If Redis flushes mid-day, users get extra embedding calls. This is acceptable because (a) Gemini's actual limit is higher than our self-imposed cap, and (b) the financial cost of extra embedding calls on the free tier is literally $0.

##### Redis: OTP hashes, podcast cache, rate limit counters

These are textbook Redis use cases and don't need a PostgreSQL alternative:

| Data | Why Redis is the only sensible choice |
|---|---|
| **OTP hashes** (`otp:{email}`, 5-min TTL) | Must auto-expire for security. Storing in Postgres would require a cron job to clean up expired OTPs — and if the cron fails, stale OTPs remain valid. Redis TTL guarantees expiry. |
| **Podcast cache** (`podcast:{topic}`, 4-day TTL) | Pure cache. If lost, we re-fetch from Listen Notes API. No data is generated or user-specific — it's just a faster read path. |
| **Rate limit counters** (`rl:{limiter}:{key}`) | Managed by `@upstash/ratelimit` library. Sliding window algorithm requires atomic increment + expire in a single round-trip — Redis is purpose-built for this. Postgres would require row-level locking and be 10-100x slower. |

##### PostgreSQL: everything else (users, rooms, companions, DMs, chats, notifications)

These are **relational, permanent, and queryable** — the core of the application. They have foreign keys, need JOINs, support complex aggregations (unread counts, recent conversations, companion status), and must never be lost. This is what PostgreSQL was built for.

#### Summary: The Decision in One Sentence

> **Postgres for data you can't afford to lose; Redis for data you can't afford to be slow.**

Upload counters protect a real cost boundary (R2 storage) and must survive for a month — Postgres. Embedding counters protect a soft daily budget and fire on every AI call — Redis. Everything else follows from asking: "Is this relational and permanent, or transient and fast?"

### Set up your database

**Option A: Neon (Recommended)**
Sign up at [neon.tech](https://neon.tech) (free tier: 512 MB), create a project, copy the connection string.

**Option B: Supabase**
Sign up at [supabase.com](https://supabase.com) (free tier: 500 MB), create a project, go to Settings → Database → Connection string (URI).

### Why Neon over Supabase (for this project)

Both are hosted PostgreSQL — but Neon is the better fit when you only need a database:

| | Neon | Supabase |
|---|---|---|
| **Philosophy** | Database-first | Backend platform with DB inside |
| **What you get** | Pure PostgreSQL, nothing else | DB + Auth + Storage + APIs + RLS policies (unused overhead) |
| **Connection** | Direct to Postgres, built-in pooling | Often routed through PostgREST/API layers, adds latency |
| **ORM freedom** | Use Prisma, Drizzle, raw SQL — zero constraints | Encourages its own SDK and patterns (subtle vendor lock-in) |
| **DB branching** | Git-like branches for testing/preview/experiments | No true DB branching |
| **Free tier projects** | ~100 projects | 2 projects |
| **Mental model** | "I have a database" | "I have a backend platform" |

Since this project already has its own auth, backend, and API layer — Supabase's extra features (Auth, Storage, Edge Functions) go completely unused. Using Supabase only for its database is like using Firebase but ignoring everything except Firestore.

**Bottom line:** If you only need PostgreSQL, Neon is cleaner, more flexible, and gives you more room to grow. But if you prefer Supabase, it works too — just swap the connection string.

### Neon vs Aiven — Full Comparison

| Factor | Neon (Serverless) | Aiven (Managed Infra) |
|---|---|---|
| **Core Type** | Serverless PostgreSQL | Managed PostgreSQL (RDS-style) |
| **Architecture** | Separation of compute + storage | Dedicated VM / instance |
| **Provision Time** | ~200ms | Minutes (VM setup) |
| **Scaling** | Auto-scale (up & down) | Manual scaling |
| **Scale to Zero** | Yes (idle = no compute cost) | Free tier may pause, but always-on otherwise |
| **Cold Start** | ~0.5–1 sec | 2–10 sec (resume VM) |
| **Connection Handling** | Built-in pooling (~10k connections) | Limited (~20–100) |
| **Failure Handling** | Auto-recover (stateless compute) | Failover via replicas |
| **Storage Model** | Distributed (S3 + SSD cache) | Local disk (VM-based) |
| **Latency (steady)** | Slightly higher (network hops) | Lower (direct disk) |
| **Latency (cold)** | ~500ms extra | Several seconds |
| **DB Branching** | Instant (copy-on-write, like Git) | Not available |
| **Dev Experience** | Extremely fast & modern | Traditional |
| **DB Tuning Control** | Limited | Full control |
| **Extensions / Configs** | Some limits | Full flexibility |
| **Pricing Model** | Usage-based (pay per compute) | Fixed (pay for instance) |
| **Idle Cost** | $0 | Still paying (always-on infra) |
| **Cost Predictability** | Variable | Predictable |
| **Free Tier Storage** | 500 MB | 1 GB |
| **Free Tier Projects** | ~100 | Typically 1 |
| **Best for Traffic** | Spiky / unpredictable | Stable / constant |
| **Ops Responsibility** | Minimal | Moderate |
| **Multi-AZ / HA** | Built-in via architecture | Configurable replicas |
| **Use Case Fit** | Modern apps, AI, SaaS, side projects | Enterprise, stable workloads |

**When to pick Neon:** Auto-scaling + scale-to-zero (pay nothing when idle), built-in connection pooling (handles thousands of connections), DB branching for testing and previews, cost efficiency for low/medium usage. Best for: modern apps, side projects, SaaS, AI apps.

**When to pick Aiven:** Predictable performance (no cold starts), full control over database internals, stable under constant heavy load, traditional infrastructure. Best for: production enterprise workloads, long-running systems.

This project uses Neon because it's a modern app with spiky traffic, benefits from scale-to-zero (free when idle), and the developer experience (instant branching, fast provisioning) is unmatched for portfolio and SaaS projects.

### Schema Migrations (Drizzle Kit)

When you define tables in `backend/src/db/schema.ts`, those definitions only exist in TypeScript — your actual PostgreSQL database has no tables yet. **Schema migration** bridges that gap: it generates SQL to create/alter tables and then runs it against your database.

Drizzle Kit provides two commands:

```bash
cd backend

# 1. Generate migration SQL from your schema
npx drizzle-kit generate

# 2. Apply the migration to your NeonDB instance
npx drizzle-kit migrate
```

**`drizzle-kit generate`** — reads `schema.ts` (via `drizzle.config.ts`) and produces a timestamped `.sql` file in `backend/src/db/migrations/`. This file contains `CREATE TABLE`, `CREATE INDEX`, `CREATE TYPE` (for enums), etc. — pure DDL, no data.

**`drizzle-kit migrate`** — connects to your `DATABASE_URL` and executes all pending migration SQL files in order. Drizzle tracks which migrations have already been applied (via a `__drizzle_migrations` table) so it never runs the same migration twice.

**When to run:**
- **First time setup:** run both commands to create all tables
- **After changing `schema.ts`:** run `generate` to create a new incremental migration, then `migrate` to apply it
- **Pulling someone else's changes:** if new migration files appear in `src/db/migrations/`, just run `migrate`

This is **not** data migration — it's DDL (Data Definition Language). Think of it as "deploy your schema to the database."

---

## Features

### Authentication (OTP + Google OAuth)

- **Two sign-in methods:** passwordless OTP and single-click Google OAuth
- **Google OAuth** — "Continue with Google" button on the auth page. Uses `@react-oauth/google` on frontend to get an access token, backend verifies it against Google's userinfo API (`POST /auth/google`). Works for both new registrations and existing logins. Stores `googleId` on the User model for account linking. Google Client ID via `VITE_GOOGLE_CLIENT_ID` env var.
- **Passwordless OTP auth** — no passwords stored. Users verify email ownership via a 6-digit OTP on every login/register
- **Redis-backed OTP** — HMAC-SHA256 signed hash stored in Upstash Redis at key `otp:{email}` with automatic TTL expiry. Server generates OTP + hash, stores hash in Redis, emails OTP to user. On verification, backend retrieves hash from Redis and deletes key (one-time use). Frontend only sends `{ email, otp }` — no hash or expiry data leaves the server
- **OTP emails via Resend** — professional email delivery service (replaced Gmail SMTP). Better deliverability, no 2FA/app-password management needed. Uses `RESEND_API_KEY` and `RESEND_FROM_EMAIL` env vars
- **Configurable expiry** via `OTP_EXPIRY_MINUTES` env var (default: 5 minutes) — maps to Redis TTL in seconds
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
- **Education section** — degree, institution, and year with inline editing. Displayed as a styled card with bold degree and secondary institution/year line
- **Projects showcase** — up to 2 projects with title, description, and clickable project link (opens in new tab). Add/remove projects in edit mode with dashed "Add Project" button. Each project rendered as a mini card with "View" link pill
- **Work Experience** — single entry with company name, role (displayed as indigo badge), duration, and description. Full inline editing with 4 input fields
- All new sections use consistent Tailwind styling with section icons (`GraduationCap`, `FolderGit2`, `Briefcase`), Framer Motion stagger animations, and full dark mode support
- Profile updates re-issue JWT and sync Redux state instantly
- Extended User model with `bio`, `avatar`, `education`, `projects[]`, and `workExperience` fields

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
- Message history stored in PostgreSQL (last 50 loaded on open)
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
- **Stored in PostgreSQL** with a 10-day retention (daily cron cleanup) — notifications survive page refreshes and logouts
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

### Podcasts

- **Podcast discovery page** at `/podcasts` accessible from the sidebar (Mic2 icon)
- **5 topic tabs:** Trending, AI, Tech, Business, Productivity & Tools — each lazily fetched on first tab visit
- **Listen Notes API** integration (`GET /podcasts/:topic`) — uses `best_podcasts` endpoint for genre-based topics and `search` for AI
- **Upstash Redis cache** — each topic stored at key `podcast:{topic}` with 4-day TTL (345,600s); auto-expires, no cleanup jobs needed. Replaced former MongoDB `Podcast` model
  - Cache validity: checks if `fetchedAt >= last Tuesday or Saturday midnight` (no cron needed for correctness)
  - Refresh chain: fresh cache → Listen Notes API → stale cache → 3 mock fallback podcasts per topic
  - `source` field in response: `"cache" | "api" | "stale-cache" | "mock"` — frontend shows amber notice on stale/mock
- **Scheduled refresh** via `node-cron` — runs at 02:00 UTC every Tuesday and Saturday (5 topics × 2 = 10 API calls/week ≈ 40/month, well within the 300/month free tier). Registered in `server.ts` on startup.
- Sequential topic fetching with 1.5s gap to avoid API burst limits
- **Podcast cards**: thumbnail, title, publisher, 3-line description, listen score badge, episode count, "Listen Now" external link → Listen Notes
- **Refresh banner**: pulsing dot + "Fresh drops every Tue & Sat — stay ahead of the curve."
- **Animated tab bar** with Framer Motion `layoutId` sliding gradient highlight per topic
- Skeleton loading grid (8 ghost cards) while fetching; error state with retry button

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
  - Messages are bulk-saved via `POST /chat/bulk-save` with a `sessionId` (UUID) grouping messages per save operation. Capped at 500 messages per request. Stored in PostgreSQL `chats` table
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
    - Global daily: `EMBEDDING_DAILY_MAX` (default 400) embedding API calls/day across all users, tracked via Redis key `embeddings:{YYYY-MM-DD}` (24h TTL)
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
- Sidebar items: Home, Chats, Summaries, My Room, Ask AI, Study Radio, Podcasts, Contact us
- "My Room" menu item dispatches room entry and navigates to call
- Profile avatar dropdown (shows emoji avatar when set, initials otherwise) with: My Profile, Settings, My Room, Ask AI, Logout
- Active route highlighting

### Rate Limiting & Security

- **Distributed rate limiting via Upstash Redis** — all rate limiters backed by `@upstash/ratelimit` with sliding window algorithm. Works across multiple server instances. Fail-open design: if Redis is temporarily down, requests are allowed through (logged error). Standard `RateLimit-*` headers on all responses
- **All rate limit thresholds configurable via env vars** — every value in `RATE_LIMIT_CONFIG` reads from a corresponding env var with sensible defaults. No code changes needed to tune limits
- **Dual-layer protection on auth endpoints** — both per-email and per-IP limits applied simultaneously:
  - Login & Register: `AUTH_MAX_PER_EMAIL` (default 7) / `AUTH_MAX_PER_IP` (default 15) per `AUTH_WINDOW_MIN` (default 15 min)
  - Send OTP: `OTP_MAX_PER_EMAIL` (default 5) / `OTP_MAX_PER_IP` (default 7) per `OTP_WINDOW_MIN` (default 15 min)
- **Per-userId rate limiting on authenticated endpoints:**
  - AI Doubt Solver & Session Summary: `AI_MAX_PER_USER` (default 20) per `AI_WINDOW_MIN` (default 15 min)
  - Summary Q&A: `SUMMARY_QA_MAX_PER_USER` (default 10) per `SUMMARY_QA_WINDOW_MIN` (default 15 min) — tighter limit since each Q&A call makes both an embedding call and a chat completion call
  - User Search: `SEARCH_MAX_PER_USER` (default 30) per `SEARCH_WINDOW_MIN` (default 1 min)
- **R2 summary upload quota:** `R2_MAX_UPLOADS_PER_MONTH` (default 10) per user per calendar month, tracked via `upload_counters` PostgreSQL table
- **Embedding daily cap:** `EMBEDDING_DAILY_MAX` (default 400) embedding API calls per day across all users, tracked via Redis key `embeddings:{YYYY-MM-DD}` with 24h TTL. Protects Gemini free tier (~1,500 RPD for embeddings)
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
- Session analytics dashboard
- Study streak tracking
- Whiteboard image export to AI (Gemini Vision) for richer spatial analysis

## Getting Started

### Prerequisites

- Node.js (v18+)
- NeonDB account (free tier: 512 MB) — or any PostgreSQL connection string
- MongoDB instance (local or Atlas) — for AI summaries
- Upstash Redis account (free tier: 256 MB, 10K commands/day) — for OTP TTL caching, podcast cache, and distributed rate limiting. Sign up at [upstash.com](https://upstash.com)
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
DATABASE_URL=your_neon_connection_string   # PostgreSQL (NeonDB) — structured data
MONGODB_URI=your_mongodb_connection_string # MongoDB — AI summaries
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io  # Upstash Redis REST URL (from console.upstash.com)
UPSTASH_REDIS_REST_TOKEN=AXxxxxxxxxxxxx          # Upstash Redis REST token
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
LISTEN_NOTES_API_KEY=your_key   # Listen Notes API key (300 free calls/month) — https://www.listennotes.com/api/
RESEND_API_KEY=re_xxxxxxxxxxxx                          # Resend API key (from https://resend.com) — replaced Gmail SMTP
RESEND_FROM_EMAIL=Virtual Study Group <noreply@yourdomain.com>  # Sender email for OTP emails (requires verified domain on Resend)
OTP_SECRET=your-random-hex-string # HMAC signing key for OTP hash (stored in Redis)
OTP_EXPIRY_MINUTES=5              # OTP validity duration (default: 5 minutes) — maps to Redis TTL

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

Run schema migrations (first time or after schema changes):

```bash
npx drizzle-kit generate   # generates SQL from schema.ts → src/db/migrations/
npx drizzle-kit migrate    # applies pending migrations to NeonDB
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
| `/podcasts`  | Podcasts        |      No       |
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
| GET    | `/user/profile`           | Get authenticated user's profile (name, email, bio, avatar, education, projects, workExperience, companion count) |
| PUT    | `/user/profile`           | Update profile (name, bio, avatar, education, projects, workExperience) — re-issues JWT |
| GET    | `/user/search?q=`         | Search users by name/email (rate limited: per-user)                  |
| GET    | `/news`                   | Get news feed articles                                               |
| GET    | `/podcasts/:topic`        | Get podcasts for topic (`trending\|ai\|tech\|business\|productivity`) — MongoDB cache, Tue/Sat refresh |
| POST   | `/ai/ask`                 | Ask AI a study question (rate limited: per-user)                     |
| POST   | `/ai/summary`             | Generate AI chat session summary (rate limited: per-user)            |
| POST   | `/ai/whiteboard-explain`  | AI analysis of whiteboard drawing (rate limited: per-user)           |
| POST   | `/ai/whiteboard-summary`  | Generate AI whiteboard summary (rate limited: per-user)              |
| POST   | `/ai/save-summary`        | Save summary to Cloudflare R2 + MongoDB, broadcast link to room chat |
| POST   | `/ai/dm-summary`          | Generate AI summary of DM conversation with a companion              |
| POST   | `/ai/summary-qa`          | RAG Q&A: ask questions across saved summaries (rate limited: per-user + daily embedding cap) |
| GET    | `/ai/summaries`           | List saved summaries (filter by `?type=room\|dm\|whiteboard`)        |
| DELETE | `/ai/summaries/:id`       | Delete a saved summary (ownership check)                             |
| POST   | `/chat/bulk-save`         | Bulk-save room chat messages to PostgreSQL (auth required, max 500)  |
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
