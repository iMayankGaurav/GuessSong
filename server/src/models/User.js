// server/src/models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        googleId: { type: String, required: true, unique: true },
        name: String,
        email: String,
        avatar: String,
        highScore: { type: Number, default: 0 },
        maxStreak: { type: Number, default: 0 },
        totalGames: { type: Number, default: 0 },
    },
    { timestamps: true }
);

export default mongoose.model("User", userSchema);