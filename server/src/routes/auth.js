// server/src/routes/auth.js
import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const googleClientId = (process.env.GOOGLE_CLIENT_ID || "").trim().replace(/^["']|["']$/g, "");
const googleClient = new OAuth2Client(googleClientId);

const isProd = process.env.NODE_ENV === "production";
const baseCookie = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
};

router.post("/google", async (req, res) => {
    try {
        const { credential, access_token } = req.body;
        if (!credential && !access_token) {
            return res.status(400).json({ error: "Missing credential or access_token" });
        }

        let p;
        if (credential) {
            const ticket = await googleClient.verifyIdToken({
                idToken: credential,
                audience: googleClientId,
            });
            p = ticket.getPayload();
        } else if (access_token) {
            const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                headers: { Authorization: `Bearer ${access_token}` },
            });
            if (!userRes.ok) {
                throw new Error("Failed to fetch Google profile: " + userRes.statusText);
            }
            p = await userRes.json();
        }

        if (!p || !p.sub) {
            throw new Error("Invalid profile payload from Google");
        }

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
            .json({ user, token });
    } catch (err) {
        console.error("Google auth verification failed:", err);
        res.status(401).json({ error: err.message || "Invalid Google token" });
    }
});

router.get("/me", requireAuth, (req, res) => res.json({ user: req.user }));

router.post("/logout", (_req, res) => {
    res.clearCookie("token", baseCookie);
    res.json({ ok: true });
});

export default router;
