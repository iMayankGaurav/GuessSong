// server/src/middleware/auth.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

function getToken(req) {
    if (req.cookies?.token) return req.cookies.token;
    const header = req.headers.authorization || req.headers.Authorization;
    if (header && typeof header === "string" && header.startsWith("Bearer ")) {
        return header.slice(7).trim();
    }
    return null;
}

export async function requireAuth(req, res, next) {
    try {
        const token = getToken(req);
        if (!token) throw new Error("No token provided");
        const { id } = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(id);
        if (!user) throw new Error("No user found");
        req.user = user;
        next();
    } catch {
        res.status(401).json({ error: "Not authenticated" });
    }
}

export async function optionalAuth(req, _res, next) {
    try {
        const token = getToken(req);
        if (token) {
            const { id } = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(id);
        }
    } catch {
        /* guest */
    }
    next();
}
