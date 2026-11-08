import { Router } from "express";
import rateLimit from "express-rate-limit";
import { searchTracks } from "../services/itunes.js";
import { CATEGORIES } from "../config/categories.js";

const router = Router();
const limiter = rateLimit({ windowMs: 60_000, limit: 20 });
const COUNTRIES = new Set(["IN", "US", "GB"]);

router.get("/categories", (_req, res) =>
    res.json({
        categories: Object.entries(CATEGORIES).map(([id, c]) => ({
            id, label: c.label, country: c.country,
        })),
    })
);

router.get("/search", limiter, async (req, res) => {
    const q = String(req.query.q || "").trim().slice(0, 80);
    if (q.length < 3) return res.json({ results: [] });
    const c = String(req.query.country || "").toUpperCase();
    try {
        res.json({ results: await searchTracks(q, COUNTRIES.has(c) ? c : "US") });
    } catch (e) {
        console.error(e);
        res.status(502).json({ error: "Search failed" });
    }
});

export default router;