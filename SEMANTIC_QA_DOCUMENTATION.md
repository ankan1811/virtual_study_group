# Semantic Q&A & Summary Generation — Technical Documentation

A deep dive into how Virtual Study Group generates summaries from chats/whiteboards, embeds them as vectors, and answers natural language questions using RAG (Retrieval-Augmented Generation).

---

## Table of Contents

1. [Summary Generation Pipeline](#1-summary-generation-pipeline)
   - [Room Chat Summary](#11-room-chat-summary)
   - [DM Chat Summary](#12-dm-chat-summary)
   - [Whiteboard Summary](#13-whiteboard-summary)
   - [Save & Embed Pipeline](#14-save--embed-pipeline)
2. [Semantic Q&A Pipeline (RAG)](#2-semantic-qa-pipeline-rag)
   - [What is RAG?](#21-what-is-rag)
   - [What are Embeddings?](#22-what-are-embeddings)
   - [Cosine Similarity Explained](#23-cosine-similarity-explained)
   - [Full Q&A Flow](#24-full-qa-flow)
3. [Rate Limiting & Free Tier Protection](#3-rate-limiting--free-tier-protection)
4. [Backfill Migration](#4-backfill-migration)
5. [Key Files Reference](#5-key-files-reference)

---

## 1. Summary Generation Pipeline

### 1.1 Room Chat Summary

Generates an AI-powered bullet-point summary from a room's chat messages.

```
 USER CLICKS "Generate Summary" (RoomCallPage → Summary Tab)
 │
 ▼
 ┌─────────────────────────────────────────────────────────┐
 │  Frontend: SummarySubTab component                      │
 │  Collects all chat messages from local state            │
 │  Format: [{ sentby: "John", msg: "What is TCP?" }, ...] │
 └───────────────────────┬─────────────────────────────────┘
                         │
                         ▼
 ┌─────────────────────────────────────────────────────────┐
 │  generateAndSaveSummary()         (summaryApi.ts)       │
 │                                                         │
 │  Step 1: POST /ai/summary                               │
 │  Body: { messages: [...chatMessages] }                  │
 └───────────────────────┬─────────────────────────────────┘
                         │
                         ▼
 ┌─────────────────────────────────────────────────────────┐
 │  Backend: summarizeSession()      (AiController.ts)     │
 │                                                         │
 │  1. Filter out bot messages (sentby !== 'bot')          │
 │  2. Format as transcript:                               │
 │     "John: What is TCP?"                                │
 │     "Alice: TCP is a transport layer protocol..."       │
 │  3. Send to Gemini 2.5 Flash:                           │
 │     ┌─────────────────────────────────────────────┐     │
 │     │ System: "You are a study session summarizer. │     │
 │     │ Given a chat log, produce a concise bullet-  │     │
 │     │ point summary highlighting: main topics,     │     │
 │     │ key concepts, questions raised, next steps." │     │
 │     ├─────────────────────────────────────────────┤     │
 │     │ User: "Summarize this study session chat:    │     │
 │     │ \n\n{chatTranscript}"                        │     │
 │     └─────────────────────────────────────────────┘     │
 │  4. max_tokens: 400                                     │
 │  5. Return { summary: "• TCP is a..." }                 │
 └───────────────────────┬─────────────────────────────────┘
                         │
                         ▼
              ┌──── Save & Embed Pipeline (Section 1.4) ────┐
              │  POST /ai/save-summary                      │
              │  (continues below)                          │
              └─────────────────────────────────────────────┘
```

### 1.2 DM Chat Summary

Generates a summary from a direct message conversation between two study companions.

```
 USER CLICKS Summary Icon (FileText) in DM Panel Header
 │
 ▼
 ┌─────────────────────────────────────────────────────────┐
 │  Frontend: DmPanel component                            │
 │  Has the companionId from the active DM conversation    │
 └───────────────────────┬─────────────────────────────────┘
                         │
                         ▼
 ┌─────────────────────────────────────────────────────────┐
 │  generateAndSaveSummary()         (summaryApi.ts)       │
 │                                                         │
 │  Step 1: POST /ai/dm-summary                            │
 │  Body: { companionId: "abc123" }                        │
 └───────────────────────┬─────────────────────────────────┘
                         │
                         ▼
 ┌─────────────────────────────────────────────────────────┐
 │  Backend: summarizeDm()           (AiController.ts)     │
 │                                                         │
 │  1. Query MongoDB for DMs between the two users:        │
 │     DirectMessage.find({                                │
 │       $or: [                                            │
 │         { from: me, to: companionId },                  │
 │         { from: companionId, to: me }                   │
 │       ]                                                 │
 │     }).sort({ createdAt: 1 }).limit(100)                │
 │     .populate('from', 'name')                           │
 │                                                         │
 │  2. Format as transcript:                               │
 │     "John: Hey, can you explain React hooks?"           │
 │     "Alice: Sure! useState is for local state..."       │
 │                                                         │
 │  3. Send to Gemini 2.5 Flash:                           │
 │     ┌─────────────────────────────────────────────┐     │
 │     │ System: "You are a study session summarizer. │     │
 │     │ Given a DM conversation between two study    │     │
 │     │ companions, produce a concise bullet-point   │     │
 │     │ summary highlighting: main topics, key       │     │
 │     │ concepts, questions, and next steps."        │     │
 │     ├─────────────────────────────────────────────┤     │
 │     │ User: "Summarize this DM conversation:       │     │
 │     │ \n\n{chatTranscript}"                        │     │
 │     └─────────────────────────────────────────────┘     │
 │  4. max_tokens: 400                                     │
 │  5. Return { summary: "• Discussed React hooks..." }    │
 └───────────────────────┬─────────────────────────────────┘
                         │
                         ▼
              ┌──── Save & Embed Pipeline (Section 1.4) ────┐
              │  POST /ai/save-summary                      │
              └─────────────────────────────────────────────┘
```

### 1.3 Whiteboard Summary

Generates a summary from the collaborative whiteboard (Excalidraw) elements.

```
 USER CLICKS "Summary" Button in Whiteboard Toolbar
 │
 ▼
 ┌─────────────────────────────────────────────────────────┐
 │  Frontend: WhiteboardPanel component                    │
 │                                                         │
 │  1. Get current Excalidraw elements via ref:            │
 │     excalidrawRef.current.getSceneElements()            │
 │                                                         │
 │  2. Simplify elements for API payload:                  │
 │     [                                                   │
 │       { type: "text", text: "TCP/IP Model" },           │
 │       { type: "rectangle", width: 200, height: 100 },   │
 │       { type: "arrow", width: 150, height: 50 },        │
 │     ]                                                   │
 └───────────────────────┬─────────────────────────────────┘
                         │
                         ▼
 ┌─────────────────────────────────────────────────────────┐
 │  generateAndSaveSummary()         (summaryApi.ts)       │
 │                                                         │
 │  Step 1: POST /ai/whiteboard-summary                    │
 │  Body: { elements: [...simplifiedElements] }            │
 └───────────────────────┬─────────────────────────────────┘
                         │
                         ▼
 ┌─────────────────────────────────────────────────────────┐
 │  Backend: summarizeWhiteboard()   (AiController.ts)     │
 │                                                         │
 │  1. Convert elements to text description:               │
 │     describeWhiteboardElements(elements)                │
 │     Output:                                             │
 │       Text: "TCP/IP Model"                              │
 │       Shape: rectangle (200x100)                        │
 │       Shape: arrow (150x50)                             │
 │                                                         │
 │  2. Send to Gemini 2.5 Flash:                           │
 │     ┌─────────────────────────────────────────────┐     │
 │     │ System: "You are a study session summarizer. │     │
 │     │ Given a whiteboard drawing description,      │     │
 │     │ produce a concise bullet-point summary of    │     │
 │     │ topics/concepts drawn, key diagrams and      │     │
 │     │ their meaning, relationships, conclusions."  │     │
 │     ├─────────────────────────────────────────────┤     │
 │     │ User: "Summarize this whiteboard:            │     │
 │     │ \n\n{description}"                           │     │
 │     └─────────────────────────────────────────────┘     │
 │  3. max_tokens: 500                                     │
 │  4. Return { summary: "• Whiteboard depicts..." }       │
 └───────────────────────┬─────────────────────────────────┘
                         │
                         ▼
              ┌──── Save & Embed Pipeline (Section 1.4) ────┐
              │  POST /ai/save-summary                      │
              └─────────────────────────────────────────────┘
```

### 1.4 Save & Embed Pipeline

All three summary types converge here. This pipeline saves the summary to Cloudflare R2, generates a vector embedding, and persists everything to MongoDB.

```
 SUMMARY TEXT ARRIVES (from any of the 3 generators above)
 │
 ▼
 ┌─────────────────────────────────────────────────────────┐
 │  Frontend: generateAndSaveSummary()  (summaryApi.ts)    │
 │                                                         │
 │  POST /ai/save-summary                                  │
 │  Body: {                                                │
 │    summary: "• TCP is a transport...",                   │
 │    roomId: "user_abc123",                               │
 │    type: "room" | "dm" | "whiteboard",                  │
 │    contextId: "user_abc123",                            │
 │    contextLabel: "John's Room",                         │
 │    title: "Room Chat Summary - Mar 8"                   │
 │  }                                                      │
 └───────────────────────┬─────────────────────────────────┘
                         │
                         ▼
 ┌─────────────────────────────────────────────────────────┐
 │  Backend: saveSummary()       (SummaryController.ts)    │
 │                                                         │
 │  STEP 1: Monthly Upload Quota Check                     │
 │  ┌───────────────────────────────────────────────┐      │
 │  │ UploadCounter.findOne({ userId, monthKey })   │      │
 │  │ If count >= R2_MAX_UPLOADS_PER_MONTH (def 10) │      │
 │  │ → 429 "Monthly upload limit reached"          │      │
 │  └───────────────────────────────────────────────┘      │
 │                         │                               │
 │                         ▼                               │
 │  STEP 2: Build HTML Document                            │
 │  ┌───────────────────────────────────────────────┐      │
 │  │ buildSummaryHTML(summary, userName, roomId)    │      │
 │  │ → Styled HTML with purple gradient header,    │      │
 │  │   metadata (user, room, date), formatted      │      │
 │  │   bullet-point content                        │      │
 │  └───────────────────────────────────────────────┘      │
 │                         │                               │
 │                         ▼                               │
 │  STEP 3: Upload to Cloudflare R2                        │
 │  ┌───────────────────────────────────────────────┐      │
 │  │ S3Client.send(PutObjectCommand({              │      │
 │  │   Bucket: "study-summaries",                  │      │
 │  │   Key: "summaries/{userId}/{contextId}_{ts}", │      │
 │  │   Body: htmlDocument,                         │      │
 │  │   ContentType: "text/html"                    │      │
 │  │ }))                                           │      │
 │  └───────────────────────────────────────────────┘      │
 │                         │                               │
 │                         ▼                               │
 │  STEP 4: Generate Presigned URL (7-day expiry)          │
 │  ┌───────────────────────────────────────────────┐      │
 │  │ getSignedUrl(GetObjectCommand, 7 days)        │      │
 │  │ → "https://r2.cloudflarestorage.com/..."      │      │
 │  └───────────────────────────────────────────────┘      │
 │                         │                               │
 │                         ▼                               │
 │  STEP 5: Generate Vector Embedding ★ (THE KEY STEP)     │
 │  ┌───────────────────────────────────────────────┐      │
 │  │ generateEmbedding(title + " " + summaryText)  │      │
 │  │                                               │      │
 │  │   ┌─────────────────────────────────────┐     │      │
 │  │   │ 5a. Check daily embedding cap       │     │      │
 │  │   │     EmbeddingCounter.findOneAndUpdate│     │      │
 │  │   │     If count > 400 → throw error    │     │      │
 │  │   ├─────────────────────────────────────┤     │      │
 │  │   │ 5b. Call Gemini Embedding API       │     │      │
 │  │   │     Model: text-embedding-004       │     │      │
 │  │   │     Input: first 2048 chars of text │     │      │
 │  │   │     Output: number[768]             │     │      │
 │  │   │     (768-dimensional float vector)  │     │      │
 │  │   └─────────────────────────────────────┘     │      │
 │  │                                               │      │
 │  │ Returns: [0.023, -0.156, 0.891, ..., 0.042]   │      │
 │  │          (768 numbers representing the         │      │
 │  │           semantic meaning of the summary)     │      │
 │  │                                               │      │
 │  │ ⚠ NON-BLOCKING: If embedding fails, summary   │      │
 │  │   still saves with embedding: [] (empty)      │      │
 │  └───────────────────────────────────────────────┘      │
 │                         │                               │
 │                         ▼                               │
 │  STEP 6: Persist to MongoDB                             │
 │  ┌───────────────────────────────────────────────┐      │
 │  │ Summary.create({                              │      │
 │  │   userId, type, contextId, contextLabel,      │      │
 │  │   title, content,                             │      │
 │  │   r2Key, r2Url,                               │      │
 │  │   embedding: [0.023, -0.156, ...]  ← VECTOR  │      │
 │  │ })                                            │      │
 │  └───────────────────────────────────────────────┘      │
 │                         │                               │
 │                         ▼                               │
 │  STEP 7: Broadcast to Room (skipped for DM type)        │
 │  ┌───────────────────────────────────────────────┐      │
 │  │ io.to(roomId).emit('message:roomId', {        │      │
 │  │   msg: "📄 John saved a summary! View: ...",  │      │
 │  │   sentby: 'bot'                               │      │
 │  │ })                                            │      │
 │  └───────────────────────────────────────────────┘      │
 │                         │                               │
 │                         ▼                               │
 │  Return { url: presignedUrl, key: r2Key }               │
 └─────────────────────────────────────────────────────────┘
                         │
                         ▼
 ┌─────────────────────────────────────────────────────────┐
 │  Frontend: Shows success toast + summary URL            │
 │  Summary now appears on /summaries page                 │
 │  Embedding is stored in MongoDB for future Q&A queries  │
 └─────────────────────────────────────────────────────────┘
```

---

## 2. Semantic Q&A Pipeline (RAG)

### 2.1 What is RAG?

**RAG (Retrieval-Augmented Generation)** is a technique where instead of relying solely on the AI model's training data, we:

1. **Retrieve** relevant documents from our own database
2. **Augment** the AI's prompt with those documents as context
3. **Generate** an answer grounded in our actual data

```
 Traditional AI:
   Question ──────────────────────────────► AI Model ──► Answer
                                            (relies only on training data,
                                             knows nothing about YOUR sessions)

 RAG (what we do):
   Question ──► Find relevant summaries ──► AI Model ──► Answer
                from YOUR database          (answers based on YOUR actual
                                             study sessions, with citations)
```

### 2.2 What are Embeddings?

An **embedding** is a list of numbers (a vector) that captures the **semantic meaning** of text. Similar texts produce similar vectors.

```
 ┌────────────────────────────────────────────────────────────────┐
 │                    HOW EMBEDDINGS WORK                         │
 ├────────────────────────────────────────────────────────────────┤
 │                                                                │
 │  Text Input                      Embedding Vector (768 dims)   │
 │  ─────────                      ───────────────────────────    │
 │                                                                │
 │  "React hooks and              → [0.82, -0.15, 0.44, ...]     │
 │   state management"                                            │
 │                                                                │
 │  "useState and useEffect       → [0.80, -0.12, 0.41, ...]     │
 │   in React"                       ↑ VERY SIMILAR (≈0.95)      │
 │                                                                │
 │  "Database indexing             → [0.11, 0.67, -0.33, ...]    │
 │   in MongoDB"                     ↑ VERY DIFFERENT (≈0.23)    │
 │                                                                │
 │  Key insight: The AI "understands" that "React hooks" and      │
 │  "useState/useEffect" are about the same topic, even though    │
 │  they use different words. This is SEMANTIC similarity, not    │
 │  keyword matching.                                             │
 │                                                                │
 │  Model used: Gemini text-embedding-004                         │
 │  Vector size: 768 floating-point numbers                       │
 │  Free tier: ~1,500 requests/day                                │
 └────────────────────────────────────────────────────────────────┘
```

### 2.3 Cosine Similarity Explained

**Cosine similarity** measures how similar two vectors are by computing the cosine of the angle between them.

```
 ┌────────────────────────────────────────────────────────────────┐
 │                   COSINE SIMILARITY                            │
 ├────────────────────────────────────────────────────────────────┤
 │                                                                │
 │  Imagine vectors as arrows in space:                           │
 │                                                                │
 │          B (React hooks summary)                               │
 │         /                                                      │
 │        / θ = 10°  ← small angle = HIGH similarity (≈0.98)     │
 │       /                                                        │
 │      A ─────────── (Question: "What did we learn about React?")│
 │       \                                                        │
 │        \                                                       │
 │         \ θ = 80° ← large angle = LOW similarity (≈0.17)      │
 │          \                                                     │
 │           C (MongoDB indexing summary)                         │
 │                                                                │
 │  Formula:                                                      │
 │                    A · B           Σ(aᵢ × bᵢ)                  │
 │  cos(θ) = ─────────────────── = ─────────────────────          │
 │            ‖A‖ × ‖B‖          √Σ(aᵢ²) × √Σ(bᵢ²)             │
 │                                                                │
 │  Score range:                                                  │
 │    1.0 = identical meaning                                     │
 │    0.7+ = highly relevant                                      │
 │    0.4-0.7 = somewhat related                                  │
 │    <0.3 = probably unrelated                                   │
 │                                                                │
 │  Implementation (AiController.ts):                             │
 │  ┌──────────────────────────────────────────────────┐          │
 │  │ function cosineSimilarity(a: number[], b: number[]) {│      │
 │  │   let dot = 0, normA = 0, normB = 0;            │          │
 │  │   for (let i = 0; i < a.length; i++) {           │          │
 │  │     dot   += a[i] * b[i];                        │          │
 │  │     normA += a[i] * a[i];                        │          │
 │  │     normB += b[i] * b[i];                        │          │
 │  │   }                                              │          │
 │  │   return dot / (Math.sqrt(normA) * Math.sqrt(normB));│      │
 │  │ }                                                │          │
 │  └──────────────────────────────────────────────────┘          │
 │                                                                │
 │  This runs in-memory (no vector DB needed) because each user   │
 │  has at most ~50-150 summaries. 768-dim × 150 comparisons      │
 │  completes in <1ms.                                            │
 └────────────────────────────────────────────────────────────────┘
```

### 2.4 Full Q&A Flow

The complete end-to-end flow when a user asks a question on the Summaries page.

```
 ╔══════════════════════════════════════════════════════════════════╗
 ║  STEP 1: USER TYPES A QUESTION                                  ║
 ║  Location: SummariesPage.tsx → Q&A Panel                        ║
 ╠══════════════════════════════════════════════════════════════════╣
 ║                                                                  ║
 ║  User types: "What did we discuss about React last week?"        ║
 ║  Or clicks a suggestion chip:                                    ║
 ║    [What topics did I study this week?]                          ║
 ║    [Summarize my recent sessions]                                ║
 ║    [What questions came up in my last study session?]            ║
 ║                                                                  ║
 ╚════════════════════════════╤═════════════════════════════════════╝
                              │
                              ▼
 ╔══════════════════════════════════════════════════════════════════╗
 ║  STEP 2: FRONTEND SENDS REQUEST                                 ║
 ║  File: SummariesPage.tsx                                        ║
 ╠══════════════════════════════════════════════════════════════════╣
 ║                                                                  ║
 ║  POST /ai/summary-qa                                             ║
 ║  Headers: { Authorization: "jwt-token-here" }                    ║
 ║  Body:    { question: "What did we discuss about React?" }       ║
 ║                                                                  ║
 ║  UI State Changes:                                               ║
 ║    qaLoading = true                                              ║
 ║    qaAnswer = null                                               ║
 ║    qaError = null                                                ║
 ║    Shows: Loader2 spinner + "Searching your summaries..."        ║
 ║                                                                  ║
 ╚════════════════════════════╤═════════════════════════════════════╝
                              │
                              ▼
 ╔══════════════════════════════════════════════════════════════════╗
 ║  STEP 3: RATE LIMIT CHECK (Layer 1 of 3)                        ║
 ║  Middleware: summaryQaLimiter        (rateLimiter.ts)            ║
 ╠══════════════════════════════════════════════════════════════════╣
 ║                                                                  ║
 ║  Check: Has this user made > 10 requests in the last 15 min?    ║
 ║                                                                  ║
 ║  ┌─────────┐     ┌────────────────────────────────────────┐     ║
 ║  │  PASS   │────►│ Continue to Step 4                     │     ║
 ║  └─────────┘     └────────────────────────────────────────┘     ║
 ║  ┌─────────┐     ┌────────────────────────────────────────┐     ║
 ║  │  FAIL   │────►│ 429: "Q&A rate limit reached.          │     ║
 ║  └─────────┘     │  Please wait before asking another     │     ║
 ║                  │  question."                            │     ║
 ║                  └────────────────────────────────────────┘     ║
 ║                                                                  ║
 ╚════════════════════════════╤═════════════════════════════════════╝
                              │ PASS
                              ▼
 ╔══════════════════════════════════════════════════════════════════╗
 ║  STEP 4: JWT AUTHENTICATION                                     ║
 ║  Middleware: verifyToken             (middleware.ts)             ║
 ╠══════════════════════════════════════════════════════════════════╣
 ║                                                                  ║
 ║  1. Extract JWT from Authorization header                        ║
 ║  2. Verify with JWT_SECRET                                       ║
 ║  3. Attach req.user = { userId, name, email }                    ║
 ║                                                                  ║
 ║  If invalid → 401 Unauthorized                                   ║
 ║                                                                  ║
 ╚════════════════════════════╤═════════════════════════════════════╝
                              │
                              ▼
 ╔══════════════════════════════════════════════════════════════════╗
 ║  STEP 5: VALIDATE QUESTION                                      ║
 ║  Controller: querySummaries()        (AiController.ts:295)      ║
 ╠══════════════════════════════════════════════════════════════════╣
 ║                                                                  ║
 ║  if (!question || question.trim().length === 0)                  ║
 ║    → 400: "Question is required"                                 ║
 ║                                                                  ║
 ╚════════════════════════════╤═════════════════════════════════════╝
                              │
                              ▼
 ╔══════════════════════════════════════════════════════════════════╗
 ║  STEP 6: FETCH USER'S SUMMARIES FROM MONGODB                    ║
 ║  Controller: querySummaries()        (AiController.ts:306)      ║
 ╠══════════════════════════════════════════════════════════════════╣
 ║                                                                  ║
 ║  Summary.find({                                                  ║
 ║    userId: req.user.userId,                                      ║
 ║    'embedding.0': { $exists: true }   ← Only summaries WITH     ║
 ║  })                                      embeddings              ║
 ║  .select('title type contextLabel content embedding createdAt')  ║
 ║                                                                  ║
 ║  Returns: Array of summaries, each containing:                   ║
 ║  ┌──────────────────────────────────────────────────────────┐    ║
 ║  │ {                                                        │    ║
 ║  │   _id: "65f...",                                         │    ║
 ║  │   title: "Room Chat Summary - Mar 5",                    │    ║
 ║  │   type: "room",                                          │    ║
 ║  │   content: "• Discussed React hooks\n• useState vs...",  │    ║
 ║  │   embedding: [0.82, -0.15, 0.44, ...(768 numbers)],     │    ║
 ║  │   createdAt: "2026-03-05T14:30:00Z"                      │    ║
 ║  │ }                                                        │    ║
 ║  └──────────────────────────────────────────────────────────┘    ║
 ║                                                                  ║
 ║  If 0 summaries found:                                           ║
 ║    → 200: { answer: "You don't have any summaries yet...",       ║
 ║             sources: [] }                                        ║
 ║                                                                  ║
 ╚════════════════════════════╤═════════════════════════════════════╝
                              │ Has summaries
                              ▼
 ╔══════════════════════════════════════════════════════════════════╗
 ║  STEP 7: EMBED THE QUESTION (Rate Limit Layer 2 of 3)           ║
 ║  Function: generateEmbedding()       (AiController.ts:265)      ║
 ╠══════════════════════════════════════════════════════════════════╣
 ║                                                                  ║
 ║  7a. Check Global Daily Cap (Layer 2)                            ║
 ║  ┌──────────────────────────────────────────────────────────┐    ║
 ║  │ EmbeddingCounter.findOneAndUpdate(                       │    ║
 ║  │   { dateKey: "2026-03-08" },     ← today's date          │    ║
 ║  │   { $inc: { count: 1 } },        ← atomic increment     │    ║
 ║  │   { upsert: true, new: true }    ← create if first call │    ║
 ║  │ )                                                        │    ║
 ║  │                                                          │    ║
 ║  │ If counter.count > 400 (EMBEDDING_DAILY_MAX):            │    ║
 ║  │   → throw "Daily embedding limit reached"                │    ║
 ║  │   → 429 response to frontend                             │    ║
 ║  └──────────────────────────────────────────────────────────┘    ║
 ║                                                                  ║
 ║  7b. Call Gemini Embedding API                                   ║
 ║  ┌──────────────────────────────────────────────────────────┐    ║
 ║  │ getClient().embeddings.create({                          │    ║
 ║  │   model: "text-embedding-004",                           │    ║
 ║  │   input: "What did we discuss about React?"              │    ║
 ║  │ })                                                       │    ║
 ║  │                                                          │    ║
 ║  │ Returns: [0.71, -0.22, 0.58, ..., 0.19]                 │    ║
 ║  │          (768-dimensional vector representing the        │    ║
 ║  │           semantic meaning of the question)              │    ║
 ║  └──────────────────────────────────────────────────────────┘    ║
 ║                                                                  ║
 ╚════════════════════════════╤═════════════════════════════════════╝
                              │
                              ▼
 ╔══════════════════════════════════════════════════════════════════╗
 ║  STEP 8: COSINE SIMILARITY — FIND MOST RELEVANT SUMMARIES       ║
 ║  Controller: querySummaries()        (AiController.ts:333)      ║
 ╠══════════════════════════════════════════════════════════════════╣
 ║                                                                  ║
 ║  Compare the question vector against EVERY summary's vector:     ║
 ║                                                                  ║
 ║  Question: [0.71, -0.22, 0.58, ...]                              ║
 ║            │                                                     ║
 ║            ├── vs Summary 1 "React hooks"    [0.82, -0.15, ...]  ║
 ║            │   Score: 0.94  ★ HIGH MATCH                         ║
 ║            │                                                     ║
 ║            ├── vs Summary 2 "useState guide" [0.78, -0.18, ...]  ║
 ║            │   Score: 0.91  ★ HIGH MATCH                         ║
 ║            │                                                     ║
 ║            ├── vs Summary 3 "MongoDB indexes" [0.11, 0.67, ...]  ║
 ║            │   Score: 0.23  ✗ LOW MATCH                          ║
 ║            │                                                     ║
 ║            ├── vs Summary 4 "React components" [0.75, -0.20, ...]║
 ║            │   Score: 0.88  ★ HIGH MATCH                         ║
 ║            │                                                     ║
 ║            ├── vs Summary 5 "CSS Grid layout"  [0.33, 0.41, ...] ║
 ║            │   Score: 0.35  ✗ LOW MATCH                          ║
 ║            │                                                     ║
 ║            └── vs Summary 6 "React router"     [0.69, -0.19, ...]║
 ║                Score: 0.85  ★ HIGH MATCH                         ║
 ║                                                                  ║
 ║  Sort by score descending → Take TOP 5:                          ║
 ║  ┌────┬───────────────────────────────┬────────┐                 ║
 ║  │ #  │ Summary                       │ Score  │                 ║
 ║  ├────┼───────────────────────────────┼────────┤                 ║
 ║  │ 1  │ React hooks (Mar 5)           │ 0.94   │                 ║
 ║  │ 2  │ useState guide (Mar 3)        │ 0.91   │                 ║
 ║  │ 3  │ React components (Mar 1)      │ 0.88   │                 ║
 ║  │ 4  │ React router (Feb 28)         │ 0.85   │                 ║
 ║  │ 5  │ CSS Grid layout (Mar 4)       │ 0.35   │                 ║
 ║  └────┴───────────────────────────────┴────────┘                 ║
 ║                                                                  ║
 ║  Note: No vector database needed! In-memory cosine similarity    ║
 ║  over ~50-150 summaries completes in <1ms.                       ║
 ║                                                                  ║
 ╚════════════════════════════╤═════════════════════════════════════╝
                              │
                              ▼
 ╔══════════════════════════════════════════════════════════════════╗
 ║  STEP 9: BUILD CONTEXT STRING FOR AI                             ║
 ║  Controller: querySummaries()        (AiController.ts:343)      ║
 ╠══════════════════════════════════════════════════════════════════╣
 ║                                                                  ║
 ║  For each of the top 5 summaries, build a formatted block:       ║
 ║                                                                  ║
 ║  ┌──────────────────────────────────────────────────────────┐    ║
 ║  │ --- Summary 1 ---                                        │    ║
 ║  │ Type: room                                               │    ║
 ║  │ Title: Room Chat Summary - Mar 5                         │    ║
 ║  │ Date: Wed, Mar 5, 2026                                   │    ║
 ║  │ Context: John's Room                                     │    ║
 ║  │ Content:                                                 │    ║
 ║  │ • Discussed React hooks in depth                         │    ║
 ║  │ • useState for local state, useEffect for side effects   │    ║
 ║  │ • Custom hooks for reusable logic                        │    ║
 ║  │ ...                                                      │    ║
 ║  │                                                          │    ║
 ║  │ --- Summary 2 ---                                        │    ║
 ║  │ Type: dm                                                 │    ║
 ║  │ Title: DM Summary - Mar 3                                │    ║
 ║  │ ...                                                      │    ║
 ║  └──────────────────────────────────────────────────────────┘    ║
 ║                                                                  ║
 ║  Each summary's content is truncated to 1000 chars max           ║
 ║  (prevents token overflow while preserving key information)      ║
 ║                                                                  ║
 ║  Token budget:                                                   ║
 ║    5 summaries × ~1000 chars ≈ 5,000 chars ≈ 1,250 tokens       ║
 ║    + System prompt ≈ 100 tokens                                  ║
 ║    + Question ≈ 50 tokens                                        ║
 ║    Total input ≈ 1,400 tokens (well within Gemini's limits)      ║
 ║                                                                  ║
 ╚════════════════════════════╤═════════════════════════════════════╝
                              │
                              ▼
 ╔══════════════════════════════════════════════════════════════════╗
 ║  STEP 10: AI GENERATES THE ANSWER                                ║
 ║  Controller: querySummaries()        (AiController.ts:358)      ║
 ╠══════════════════════════════════════════════════════════════════╣
 ║                                                                  ║
 ║  Call Gemini 2.5 Flash via OpenAI-compatible API:                ║
 ║                                                                  ║
 ║  ┌──────────────────────────────────────────────────────────┐    ║
 ║  │ SYSTEM PROMPT:                                           │    ║
 ║  │ "You are a study assistant with access to the user's     │    ║
 ║  │  saved session summaries. Answer their question based    │    ║
 ║  │  ONLY on the provided summaries. If the answer is not    │    ║
 ║  │  found in any summary, say so honestly. Always cite      │    ║
 ║  │  which summary title and date your answer comes from.    │    ║
 ║  │  Format your answer with bullet points for clarity."     │    ║
 ║  ├──────────────────────────────────────────────────────────┤    ║
 ║  │ USER MESSAGE:                                            │    ║
 ║  │ "Here are my saved study summaries:                      │    ║
 ║  │                                                          │    ║
 ║  │  {context string from Step 9}                            │    ║
 ║  │                                                          │    ║
 ║  │  ---                                                     │    ║
 ║  │                                                          │    ║
 ║  │  My question: What did we discuss about React?"          │    ║
 ║  └──────────────────────────────────────────────────────────┘    ║
 ║                                                                  ║
 ║  max_tokens: 800                                                 ║
 ║                                                                  ║
 ║  AI Response Example:                                            ║
 ║  ┌──────────────────────────────────────────────────────────┐    ║
 ║  │ Based on your summaries, here's what you discussed       │    ║
 ║  │ about React:                                             │    ║
 ║  │                                                          │    ║
 ║  │ • In your Room Chat session on Mar 5, you covered        │    ║
 ║  │   React hooks including useState, useEffect, and         │    ║
 ║  │   custom hooks for reusable logic.                       │    ║
 ║  │                                                          │    ║
 ║  │ • In your DM with Alice on Mar 3, you discussed          │    ║
 ║  │   component composition patterns and prop drilling       │    ║
 ║  │   alternatives.                                          │    ║
 ║  │                                                          │    ║
 ║  │ • Your session on Mar 1 focused on React component       │    ║
 ║  │   lifecycle and rendering optimization.                  │    ║
 ║  └──────────────────────────────────────────────────────────┘    ║
 ║                                                                  ║
 ╚════════════════════════════╤═════════════════════════════════════╝
                              │
                              ▼
 ╔══════════════════════════════════════════════════════════════════╗
 ║  STEP 11: BUILD RESPONSE WITH SOURCES                            ║
 ║  Controller: querySummaries()        (AiController.ts:380)      ║
 ╠══════════════════════════════════════════════════════════════════╣
 ║                                                                  ║
 ║  Response JSON:                                                  ║
 ║  {                                                               ║
 ║    "answer": "Based on your summaries, here's what you...",      ║
 ║    "sources": [                                                  ║
 ║      {                                                           ║
 ║        "_id": "65f...",                                          ║
 ║        "title": "Room Chat Summary - Mar 5",                    ║
 ║        "type": "room",                                          ║
 ║        "createdAt": "2026-03-05T14:30:00Z",                     ║
 ║        "score": 0.94    ← cosine similarity score               ║
 ║      },                                                         ║
 ║      {                                                           ║
 ║        "_id": "65e...",                                          ║
 ║        "title": "DM Summary - Mar 3",                           ║
 ║        "type": "dm",                                            ║
 ║        "createdAt": "2026-03-03T10:15:00Z",                     ║
 ║        "score": 0.91                                            ║
 ║      },                                                         ║
 ║      ...                                                        ║
 ║    ]                                                             ║
 ║  }                                                               ║
 ║                                                                  ║
 ╚════════════════════════════╤═════════════════════════════════════╝
                              │
                              ▼
 ╔══════════════════════════════════════════════════════════════════╗
 ║  STEP 12: FRONTEND RENDERS THE ANSWER                            ║
 ║  File: SummariesPage.tsx                                        ║
 ╠══════════════════════════════════════════════════════════════════╣
 ║                                                                  ║
 ║  State Updates:                                                  ║
 ║    qaLoading = false                                             ║
 ║    qaAnswer = "Based on your summaries, here's what you..."      ║
 ║    qaSources = [{ title, type, createdAt, score }, ...]          ║
 ║                                                                  ║
 ║  UI Renders:                                                     ║
 ║  ┌──────────────────────────────────────────────────────────┐    ║
 ║  │                                                          │    ║
 ║  │  Answer text (whitespace-pre-line, fades in via          │    ║
 ║  │  Framer Motion):                                         │    ║
 ║  │                                                          │    ║
 ║  │  "Based on your summaries, here's what you discussed     │    ║
 ║  │   about React:                                           │    ║
 ║  │   • In your Room Chat session on Mar 5, you covered..."  │    ║
 ║  │                                                          │    ║
 ║  │  ─────────────── Sources ───────────────                 │    ║
 ║  │                                                          │    ║
 ║  │  [💬 Room Chat Summary - Mar 5  Mar 5]                   │    ║
 ║  │  [👥 DM Summary - Mar 3  Mar 3]                          │    ║
 ║  │  [💬 React components - Mar 1  Mar 1]                    │    ║
 ║  │                                                          │    ║
 ║  │  (color-coded chips matching typeBadgeColors:            │    ║
 ║  │   room=indigo, dm=emerald, whiteboard=teal)              │    ║
 ║  │                                                          │    ║
 ║  └──────────────────────────────────────────────────────────┘    ║
 ║                                                                  ║
 ║  Error Handling:                                                  ║
 ║  - 429 → amber warning: "Q&A rate limit reached..."             ║
 ║  - 429 (daily) → amber warning: "Daily embedding limit..."      ║
 ║  - 500 → amber warning: "Something went wrong..."               ║
 ║                                                                  ║
 ╚══════════════════════════════════════════════════════════════════╝
```

---

## 3. Rate Limiting & Free Tier Protection

Three independent layers prevent exceeding the Gemini free tier.

```
 ┌────────────────────────────────────────────────────────────────┐
 │              RATE LIMITING ARCHITECTURE                        │
 │              (3 Layers of Protection)                          │
 ├────────────────────────────────────────────────────────────────┤
 │                                                                │
 │  LAYER 1: Per-User Request Limiter (express-rate-limit)        │
 │  ┌──────────────────────────────────────────────────────┐      │
 │  │ summaryQaLimiter                                     │      │
 │  │ Window: 15 minutes (SUMMARY_QA_WINDOW_MIN)           │      │
 │  │ Max: 10 requests per user (SUMMARY_QA_MAX_PER_USER)  │      │
 │  │ Scope: Per authenticated userId                      │      │
 │  │ Applied at: Route middleware level                    │      │
 │  │ Response: 429 + RateLimit-* headers                  │      │
 │  └──────────────────────────────────────────────────────┘      │
 │                         │                                      │
 │                         ▼                                      │
 │  LAYER 2: Global Daily Embedding Cap (MongoDB counter)         │
 │  ┌──────────────────────────────────────────────────────┐      │
 │  │ EmbeddingCounter collection                          │      │
 │  │ Document: { dateKey: "2026-03-08", count: 42 }       │      │
 │  │ Max: 400/day (EMBEDDING_DAILY_MAX)                   │      │
 │  │ Scope: ALL users combined                            │      │
 │  │ Check: Atomic findOneAndUpdate before every           │      │
 │  │        embedding API call                            │      │
 │  │ Resets: Automatically (new dateKey each day)          │      │
 │  └──────────────────────────────────────────────────────┘      │
 │                         │                                      │
 │                         ▼                                      │
 │  LAYER 3: Natural Limits on Save-Time Embeddings               │
 │  ┌──────────────────────────────────────────────────────┐      │
 │  │ R2 Monthly Upload Quota                              │      │
 │  │ Max: 10 uploads/month (R2_MAX_UPLOADS_PER_MONTH)     │      │
 │  │ Since each save = 1 embedding call, this naturally   │      │
 │  │ caps save-time embeddings at 10/month/user            │      │
 │  └──────────────────────────────────────────────────────┘      │
 │                                                                │
 │  Where embedding API calls happen:                             │
 │  ┌────────────────┬──────────────┬────────────────────────┐    │
 │  │ Action         │ Calls/action │ Limited by              │    │
 │  ├────────────────┼──────────────┼────────────────────────┤    │
 │  │ Save summary   │ 1            │ Layer 2 + Layer 3      │    │
 │  │ Q&A question   │ 1            │ Layer 1 + Layer 2      │    │
 │  │ Backfill script│ N            │ 1-sec delay + Layer 2  │    │
 │  └────────────────┴──────────────┴────────────────────────┘    │
 │                                                                │
 │  Gemini Free Tier Budget:                                      │
 │  ┌──────────────────────────────────────────────────────┐      │
 │  │ text-embedding-004:  ~1,500 RPD (requests per day)   │      │
 │  │ Our daily cap:       400 RPD (73% headroom)          │      │
 │  │ Gemini 2.5 Flash:    250 RPD / 250K TPM              │      │
 │  └──────────────────────────────────────────────────────┘      │
 │                                                                │
 └────────────────────────────────────────────────────────────────┘
```

---

## 4. Backfill Migration

For existing summaries that were saved before the embedding feature was added.

```
 ┌────────────────────────────────────────────────────────────────┐
 │  BACKFILL SCRIPT                                               │
 │  File: backend/src/scripts/backfillEmbeddings.ts               │
 │  Run:  cd backend && npx ts-node src/scripts/backfillEmbeddings.ts │
 ├────────────────────────────────────────────────────────────────┤
 │                                                                │
 │  1. Connect to MongoDB                                         │
 │     │                                                          │
 │     ▼                                                          │
 │  2. Find summaries with empty/missing embeddings               │
 │     Summary.find({ $or: [                                      │
 │       { embedding: { $exists: false } },                       │
 │       { embedding: { $size: 0 } }                              │
 │     ] })                                                       │
 │     │                                                          │
 │     ▼                                                          │
 │  3. For each summary:                                          │
 │     ┌───────────────────────────────────┐                      │
 │     │ a. generateEmbedding(title+content)│                     │
 │     │ b. Summary.updateOne({ embedding })│                     │
 │     │ c. Log progress: [3/12] Embedded   │                     │
 │     │ d. Sleep 1 second (rate limit)     │                     │
 │     └───────────────────────────────────┘                      │
 │     │                                                          │
 │     ▼ (repeat for each summary)                                │
 │                                                                │
 │  4. If daily limit hit mid-run:                                │
 │     → "Daily limit reached. Re-run tomorrow."                  │
 │     → Script exits gracefully, remaining summaries             │
 │       will be processed on next run                            │
 │     │                                                          │
 │     ▼                                                          │
 │  5. Done: "12 embedded, 0 failed"                              │
 │     Disconnect from MongoDB                                    │
 │                                                                │
 └────────────────────────────────────────────────────────────────┘
```

---

## 5. Key Files Reference

| File | Role |
|------|------|
| `backend/src/controllers/AiController.ts` | `generateEmbedding()`, `cosineSimilarity()`, `querySummaries()` controller |
| `backend/src/controllers/SummaryController.ts` | `saveSummary()` — generates embedding at save time (non-blocking) |
| `backend/src/models/Summary.ts` | Schema with `embedding: [Number]` field (768-dim vector) |
| `backend/src/models/EmbeddingCounter.ts` | Global daily embedding counter (`dateKey` + `count`) |
| `backend/src/middlewares/rateLimiter.ts` | `summaryQaLimiter` (10/15min) + `EMBEDDING_DAILY_MAX` (400) config |
| `backend/src/routes/aiRoutes.ts` | `POST /ai/summary-qa` route registration |
| `backend/src/scripts/backfillEmbeddings.ts` | One-time migration for existing summaries |
| `frontend/src/pages/SummariesPage.tsx` | Q&A panel UI (input, suggestions, answer, source citations) |
| `frontend/src/utils/summaryApi.ts` | `generateAndSaveSummary()` shared utility |
