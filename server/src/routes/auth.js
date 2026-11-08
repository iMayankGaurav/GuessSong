// server/src/routes/auth.js
import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const isProd = process.env.NODE_ENV === "production";
const baseCookie = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
};

router.post("/google", async (req, res) => {
    try {
        const { credential } = req.body;
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const p = ticket.getPayload();

        const user = await User.findOneAndUpdate(
            { googleId: p.sub },
            { name: p.name, email: p.email, avatar: p.picture },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "7d",
        });
        res
            .cookie("token", token, { ...baseCookie, maxAge: 7 * 24 * 60 * 60 * 1000 })
            .json({ user });
    } catch {
        res.status(401).json({ error: "Invalid Google token" });
    }
});

router.get("/me", requireAuth, (req, res) => res.json({ user: req.user }));

router.post("/logout", (_req, res) => {
    res.clearCookie("token", baseCookie);
    res.json({ ok: true });
});

export default router;