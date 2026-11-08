// server/src/routes/profile.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import Game from "../models/Game.js";
import { CATEGORIES } from "../config/categories.js";

const router = Router();

function getDayDiff(dateStrA, dateStrB) {
    const a = new Date(dateStrA + "T00:00:00Z");
    const b = new Date(dateStrB + "T00:00:00Z");
    return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function calculateStreaks(sortedDates, todayStr) {
    if (sortedDates.length === 0) {
        return { currentDayStreak: 0, longestDayStreak: 0 };
    }

    // Longest streak
    let longest = 1;
    let running = 1;
    for (let i = 1; i < sortedDates.length; i++) {
        const diff = getDayDiff(sortedDates[i - 1], sortedDates[i]);
        if (diff === 1) {
            running += 1;
            longest = Math.max(longest, running);
        } else if (diff > 1) {
            running = 1;
        }
    }

    // Current streak (checking today or yesterday)
    const dateSet = new Set(sortedDates);
    let current = 0;
    let checkDate = new Date(todayStr + "T00:00:00Z");

    if (!dateSet.has(todayStr)) {
        // If not played today, check if yesterday was played
        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
        const yStr = checkDate.toISOString().slice(0, 10);
        if (!dateSet.has(yStr)) {
            return { currentDayStreak: 0, longestDayStreak: longest };
        }
    }

    // Count backwards day by day
    while (true) {
        const dStr = checkDate.toISOString().slice(0, 10);
        if (dateSet.has(dStr)) {
            current += 1;
            checkDate.setUTCDate(checkDate.getUTCDate() - 1);
        } else {
            break;
        }
    }

    return { currentDayStreak: current, longestDayStreak: Math.max(longest, current) };
}

router.get("/me", requireAuth, async (req, res) => {
    try {
        let tz = String(req.query.tz || "UTC");
        try {
            new Intl.DateTimeFormat(undefined, { timeZone: tz });
        } catch {
            tz = "UTC";
        }

        // Today's date string in the requested timezone
        const fmt = new Intl.DateTimeFormat("en-CA", {
            timeZone: tz,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
        const todayStr = fmt.format(new Date());

        const todayObj = new Date(todayStr + "T00:00:00Z");
        const fromObj = new Date(todayObj.getTime() - 364 * 24 * 60 * 60 * 1000);
        const fromStr = fromObj.toISOString().slice(0, 10);

        // 1. Heatmap and all-mode round aggregation
        const roundAgg = await Game.aggregate([
            { $match: { userId: req.user._id } },
            { $unwind: "$rounds" },
            { $match: { "rounds.status": { $in: ["solved", "failed"] } } },
            {
                $project: {
                    status: "$rounds.status",
                    stage: "$rounds.stage",
                    points: { $ifNull: ["$rounds.points", 0] },
                    date: {
                        $dateToString: {
                            date: { $ifNull: ["$rounds.endedAt", "$updatedAt"] },
                            timezone: tz,
                            format: "%Y-%m-%d",
                        },
                    },
                },
            },
            {
                $group: {
                    _id: "$date",
                    rounds: { $sum: 1 },
                    solved: { $sum: { $cond: [{ $eq: ["$status", "solved"] }, 1, 0] } },
                    points: { $sum: "$points" },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const allDates = roundAgg.map((d) => d._id);
        const { currentDayStreak, longestDayStreak } = calculateStreaks(allDates, todayStr);

        const heatmapDays = roundAgg
            .filter((d) => d._id >= fromStr && d._id <= todayStr)
            .map((d) => ({
                date: d._id,
                rounds: d.rounds,
                solved: d.solved,
                points: d.points,
            }));

        // 2. Round stats (including casual)
        const roundStats = await Game.aggregate([
            { $match: { userId: req.user._id } },
            { $unwind: "$rounds" },
            { $match: { "rounds.status": { $in: ["solved", "failed"] } } },
            {
                $group: {
                    _id: null,
                    roundsPlayed: { $sum: 1 },
                    roundsSolved: { $sum: { $cond: [{ $eq: ["$status", "solved"] }, 1, 0] } },
                    solvedAtFirstStage: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$status", "solved"] }, { $eq: ["$rounds.stage", 0] }] },
                                1,
                                0,
                            ],
                        },
                    },
                    totalSolveStage: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "solved"] }, "$rounds.stage", 0],
                        },
                    },
                },
            },
        ]);

        const rStats = roundStats[0] || {
            roundsPlayed: 0,
            roundsSolved: 0,
            solvedAtFirstStage: 0,
            totalSolveStage: 0,
        };

        const accuracy = rStats.roundsPlayed > 0
            ? Math.round((rStats.roundsSolved / rStats.roundsPlayed) * 1000) / 1000
            : 0;

        const avgSolveStage = rStats.roundsSolved > 0
            ? Math.round((rStats.totalSolveStage / rStats.roundsSolved) * 10) / 10
            : 0;

        // Favorite category across all games
        const favAgg = await Game.aggregate([
            { $match: { userId: req.user._id } },
            { $group: { _id: "$source", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 },
        ]);
        const favId = favAgg[0]?._id;
        const favoriteCategory = favId ? (CATEGORIES[favId]?.label || favId) : "None";

        // 3. Ranked stats (finished classic/endless only)
        const rankedGames = await Game.find({
            userId: req.user._id,
            status: "finished",
            mode: { $in: ["classic", "endless"] },
        }).sort({ createdAt: -1 });

        const gamesPlayed = rankedGames.length;
        const highScore = rankedGames.reduce(
            (max, g) => Math.max(max, g.totalScore || 0),
            req.user.highScore || 0
        );
        const maxStreak = rankedGames.reduce(
            (max, g) => Math.max(max, g.maxStreak || 0),
            req.user.maxStreak || 0
        );

        // Recent 10 games
        const recent = rankedGames.slice(0, 10).map((g) => ({
            mode: g.mode,
            categoryLabel: CATEGORIES[g.source]?.label || g.source,
            totalScore: g.totalScore,
            maxStreak: g.maxStreak,
            playedAt: g.createdAt,
        }));

        // Categories breakdown for ranked games
        const categories = Object.entries(CATEGORIES).map(([id, c]) => {
            const catGames = rankedGames.filter((g) => g.source === id);
            const catBest = catGames.reduce((max, g) => Math.max(max, g.totalScore || 0), 0);
            const catRounds = catGames.flatMap((g) =>
                (g.rounds || []).filter((r) => r.status === "solved" || r.status === "failed")
            );
            const catAccuracy = catRounds.length > 0
                ? Math.round((catRounds.filter((r) => r.status === "solved").length / catRounds.length) * 1000) / 1000
                : 0;

            return {
                id,
                label: c.label,
                bestScore: catBest,
                gamesPlayed: catGames.length,
                accuracy: catAccuracy,
            };
        });

        res.json({
            user: {
                name: req.user.name,
                avatar: req.user.avatar,
                email: req.user.email,
                createdAt: req.user.createdAt,
            },
            stats: {
                highScore,
                maxStreak,
                gamesPlayed,
                roundsPlayed: rStats.roundsPlayed,
                roundsSolved: rStats.roundsSolved,
                accuracy,
                solvedAtFirstStage: rStats.solvedAtFirstStage,
                avgSolveStage,
                currentDayStreak,
                longestDayStreak,
                favoriteCategory,
            },
            heatmap: {
                from: fromStr,
                to: todayStr,
                days: heatmapDays,
            },
            categories,
            recent,
        });
    } catch (e) {
        console.error("Profile route error:", e);
        res.status(500).json({ error: "Failed to load profile" });
    }
});

export default router;

