import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import roomRoutes from "./routes/roomRoutes";
import authRoutes from "./routes/authRoutes";
import chatRoutes from "./routes/chatRoutes"
import dotenv from "dotenv";
import cors from "cors";
dotenv.config();

const app = express();
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

// Routes
app.use("/auth", authRoutes);
app.use("/room", roomRoutes);
app.use("/chat",chatRoutes);

app.listen(PORT, () => {
  console.log(`🔥🧯 Server is running on PORT ${PORT} ⚡`);
});
