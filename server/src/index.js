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


const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_, res) => res.json({ ok: true }));
// app.use("/api/auth", authRoutes) ... add as you build them

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, credentials: true },
});
// registerPartySockets(io);
app.use("/api/auth", authRoutes);
app.use("/api/game", gameRoutes);
app.use("/api/songs", songRoutes);

try {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");
} catch (err) {
  console.error("MongoDB connection error:", err.message);
}

server.listen(process.env.PORT, () => console.log("API on", process.env.PORT));