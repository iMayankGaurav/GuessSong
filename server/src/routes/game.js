// server/src/routes/game.js
import { Router } from "express";
import crypto from "crypto";
import Game from "../models/Game.js";
import User from "../models/User.js";
import { optionalAuth } from "../middleware/auth.js";
import {
    STAGES, ROUNDS_CLASSIC, ROUNDS_ENDLESS_MAX, calcPoints,
} from "../config/scoring.js";
import { getPool, pickRandom } from "../services/itunes.js";
import { CATEGORIES } from "../config/categories.js";
import { isMatch } from "../services/matcher.js";

const router = Router();

const view = (game) => {
    const r = game.rounds[game.current];
    return {
        round: game.current + 1,
        totalRounds: game.rounds.length,
        stage: r.stage,
        stageSeconds: STAGES[r.stage],
        streak: game.streak,
        totalScore: game.totalScore,
    };
};
const reveal = (r) => ({ id: r.trackId, title: r.title, artist: r.artist, cover: r.cover });

async function loadGame(req, res) {
    const game = await Game.findOne({ token: req.params.token });
    if (!game || game.status === "finished") {
        res.status(404).json({ error: "Game not found" });
        return null;
    }
    return game;
}

async function advanceStage(game, r, res) {
    if (r.stage >= STAGES.length - 1) {
        r.status = "failed";
        r.endedAt = new Date();
        r.points = 0;
        game.streak = 0;
        await game.save();
        return res.json({ correct: false, roundOver: true, points: 0, answer: reveal(r), ...view(game) });
    }
    r.stage += 1;
    r.stageStartedAt = new Date();
    await game.save();
    res.json({ correct: false, roundOver: false, ...view(game) });
}

// Start a game
router.post("/start", optionalAuth, async (req, res) => {
    try {
        const category = req.body?.category || "bollywood-modern";
        if (!Object.hasOwn(CATEGORIES, category))
            return res.status(400).json({ error: "Unknown category" });
        const rawMode = req.body?.mode;
        const mode = rawMode === "endless" ? "endless" : rawMode === "casual" ? "casual" : "classic";

        const pool = await getPool(category);
        const total = Math.min(mode === "classic" ? ROUNDS_CLASSIC : ROUNDS_ENDLESS_MAX, pool.length);
        if (total < ROUNDS_CLASSIC) return res.status(422).json({ error: "Not enough playable tracks" });

        const game = await Game.create({
            token: crypto.randomUUID(),
            userId: req.user?._id,
            mode,
            source: category,
            rounds: pickRandom(pool, total).map((t) => ({
                trackId: t.id, title: t.title, artist: t.artist, cover: t.cover,
                previewUrl: t.previewUrl, stageStartedAt: new Date(),
            })),
        });
        res.json({
            token: game.token, mode, category,
            country: CATEGORIES[category].country,
            stages: STAGES, ...view(game),
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Could not start game" });
    }
});

// Audio for the current round (proxied so the track id never reaches the client)
router.get("/:token/audio", async (req, res) => {
    try {
        const game = await loadGame(req, res);
        if (!game) return;
        const r = game.rounds[game.current];

        const upstream = await fetch(r.previewUrl);
        if (!upstream.ok) throw new Error("Preview fetch failed");

        if (r.stage === 0) {          // start the clock when the audio is actually delivered
            r.stageStartedAt = new Date();
            await game.save();
        }
        res.set({
            "Content-Type": upstream.headers.get("content-type") || "audio/mp4",
            "Cache-Control": "no-store",
        });
        res.send(Buffer.from(await upstream.arrayBuffer()));
    } catch (e) {
        console.error(e);
        res.status(502).json({ error: "Could not load audio" });
    }
});

// Guess
router.post("/:token/guess", async (req, res) => {
    try {
        const game = await loadGame(req, res);
        if (!game) return;
        const r = game.rounds[game.current];
        if (r.status !== "playing") return res.status(409).json({ error: "Round is over" });

        const { id, title, artist } = req.body || {};
        if (typeof title !== "string" || typeof artist !== "string")
            return res.status(400).json({ error: "title and artist required" });

        const correct = isMatch(
            { id, title, artist },
            { id: r.trackId, title: r.title, artist: r.artist }
        );
        if (!correct) return advanceStage(game, r, res);

        const elapsedSec = (Date.now() - r.stageStartedAt.getTime()) / 1000;
        const points = calcPoints({ stage: r.stage, elapsedSec, streakBefore: game.streak });
        r.status = "solved";
        r.endedAt = new Date();
        r.points = points;
        game.totalScore += points;
        game.streak += 1;
        game.maxStreak = Math.max(game.maxStreak, game.streak);
        await game.save();
        res.json({ correct: true, roundOver: true, points, answer: reveal(r), ...view(game) });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Guess failed" });
    }
});

// Skip (unlocks the next, longer clip)
router.post("/:token/skip", async (req, res) => {
    try {
        const game = await loadGame(req, res);
        if (!game) return;
        const r = game.rounds[game.current];
        if (r.status !== "playing") return res.status(409).json({ error: "Round is over" });
        advanceStage(game, r, res);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Skip failed" });
    }
});

// Next round, or finish the game and save stats
router.post("/:token/next", async (req, res) => {
    try {
        const game = await loadGame(req, res);
        if (!game) return;
        const r = game.rounds[game.current];
        if (r.status === "playing") return res.status(409).json({ error: "Round not finished" });

        // Casual mode: a miss never ends the session; replenish tracks when fewer than 3 remain
        if (game.mode === "casual") {
            const unplayed = game.rounds.length - 1 - game.current;
            if (unplayed < 3) {
                try {
                    const pool = await getPool(game.source);
                    const usedIds = new Set(game.rounds.map((x) => String(x.trackId)));
                    let candidates = pool.filter((t) => !usedIds.has(String(t.id)));
                    if (candidates.length === 0) {
                        const lastTrackId = String(r.trackId);
                        candidates = pool.filter((t) => String(t.id) !== lastTrackId);
                    }
                    const picked = pickRandom(candidates, Math.min(20, candidates.length));
                    for (const t of picked) {
                        game.rounds.push({
                            trackId: t.id,
                            title: t.title,
                            artist: t.artist,
                            cover: t.cover,
                            previewUrl: t.previewUrl,
                        });
                    }
                } catch (err) {
                    console.error("Casual pool replenish error:", err);
                }
            }

            if (game.current < game.rounds.length - 1) {
                game.current += 1;
                game.rounds[game.current].stageStartedAt = new Date();
                await game.save();
                return res.json({ finished: false, ...view(game) });
            }
        }

        const endlessOver = game.mode === "endless" && r.status === "failed";
        if (!endlessOver && game.current < game.rounds.length - 1) {
            game.current += 1;
            game.rounds[game.current].stageStartedAt = new Date();
            await game.save();
            return res.json({ finished: false, ...view(game) });
        }

        game.status = "finished";
        await game.save();
        if (game.userId && game.mode !== "casual") {
            await User.updateOne(
                { _id: game.userId },
                { $max: { highScore: game.totalScore, maxStreak: game.maxStreak }, $inc: { totalGames: 1 } }
            );
        }
        res.json({
            finished: true,
            saved: Boolean(game.userId && game.mode !== "casual"),
            totalScore: game.totalScore,
            maxStreak: game.maxStreak,
            rounds: game.rounds
                .filter((x) => x.status !== "playing")
                .map((x) => ({ ...reveal(x), solved: x.status === "solved", stage: x.stage, points: x.points })),
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Next failed" });
    }
});

// End casual session
router.post("/:token/end", async (req, res) => {
    try {
        const game = await loadGame(req, res);
        if (!game) return;
        if (game.mode !== "casual") {
            return res.status(400).json({ error: "End session is only allowed for casual mode" });
        }

        game.status = "finished";
        await game.save();

        res.json({
            finished: true,
            casual: true,
            saved: false,
            totalScore: game.totalScore,
            maxStreak: game.maxStreak,
            rounds: game.rounds
                .filter((x) => x.status !== "playing")
                .map((x) => ({ ...reveal(x), solved: x.status === "solved", stage: x.stage, points: x.points })),
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "End session failed" });
    }
});

export default router;