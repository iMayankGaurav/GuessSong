// server/src/index.js
import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import mongoose from "mongoose";
import { Server } from "socket.io";

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

await mongoose.connect(process.env.MONGO_URI);
server.listen(process.env.PORT, () => console.log("API on", process.env.PORT));