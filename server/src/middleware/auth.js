// server/src/middleware/auth.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function requireAuth(req, res, next) {
    try {
        const { id } = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
        const user = await User.findById(id);
        if (!user) throw new Error("no user");
        req.user = user;
        next();
    } catch {
        res.status(401).json({ error: "Not authenticated" });
    }
}

export async function optionalAuth(req, _res, next) {
    try {
        const { id } = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
        req.user = await User.findById(id);
    } catch {
        /* guest */
    }
    next();
}