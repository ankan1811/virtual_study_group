import express from "express";
import http from "http";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import roomRoutes from "./routes/roomRoutes";
import authRoutes from "./routes/authRoutes";
import chatRoutes from "./routes/chatRoutes";
import companionRoutes from "./routes/companionRoutes";
import userRoutes from "./routes/userRoutes";
import newsRoutes from "./routes/newsRoutes";
import aiRoutes from "./routes/aiRoutes";
import dmRoutes from "./routes/dmRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import podcastRoutes from "./routes/podcastRoutes";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import { initSocketServer } from "./socketServer";
import { globalLimiter } from "./middlewares/rateLimiter";
import { startPodcastCacheJob } from "./jobs/podcastCacheJob";
dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();
app.set("trust proxy", 1);
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3000;

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI || "", {})
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

app.use(cors());
app.use(bodyParser.json());
app.use(globalLimiter);

// Routes
app.use("/auth", authRoutes);
app.use("/room", roomRoutes);
app.use("/chat", chatRoutes);
app.use("/companion", companionRoutes);
app.use("/user", userRoutes);
app.use("/news", newsRoutes);
app.use("/ai", aiRoutes);
app.use("/dm", dmRoutes);
app.use("/notifications", notificationRoutes);
app.use("/podcasts", podcastRoutes);

// Attach Socket.IO to the same HTTP server (no separate port needed)
initSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`🔥🧯 Server is running on PORT ${PORT} ⚡`);
  startPodcastCacheJob();
});
