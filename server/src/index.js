// server/src/index.js
import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import mongoose from "mongoose";
import { Server } from "socket.io";
import authRoutes from "./routes/auth.js";
import gameRoutes from "./routes/game.js";
import songRoutes from "./routes/songs.js";
import profileRoutes from "./routes/profile.js";


const app = express();
app.set("trust proxy", 1);
app.use(helmet());

const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
app.use(cors({ origin: clientUrl, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_, res) => res.json({ ok: true }));
// app.use("/api/auth", authRoutes) ... add as you build them

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: clientUrl, credentials: true },
});
// registerPartySockets(io);
app.use("/api/auth", authRoutes);
app.use("/api/game", gameRoutes);
app.use("/api/songs", songRoutes);
app.use("/api/profile", profileRoutes);

try {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");
} catch (err) {
  console.error("MongoDB connection error:", err.message);
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log("API on", PORT));