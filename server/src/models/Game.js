// server/src/models/Game.js
import mongoose from "mongoose";

const roundSchema = new mongoose.Schema(
    {
        trackId: String,
        title: String,
        artist: String,
        cover: String,
        previewUrl: String,
        stage: { type: Number, default: 0 },
        stageStartedAt: Date,
        endedAt: Date,
        status: { type: String, enum: ["playing", "solved", "failed"], default: "playing" },
        points: { type: Number, default: 0 },
    },
    { _id: false }
);

const gameSchema = new mongoose.Schema(
    {
        token: { type: String, required: true, unique: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // empty for guests
        mode: { type: String, enum: ["classic", "endless", "casual"], default: "classic" },
        source: String,
        rounds: [roundSchema],
        current: { type: Number, default: 0 },
        streak: { type: Number, default: 0 },
        maxStreak: { type: Number, default: 0 },
        totalScore: { type: Number, default: 0 },
        status: { type: String, enum: ["active", "finished"], default: "active" },
    },
    { timestamps: true }
);

gameSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Game", gameSchema);