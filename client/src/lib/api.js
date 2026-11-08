// client/src/lib/api.js
import axios from "axios";

const rawUrl = import.meta.env.VITE_API_URL || "/api";
export const API_URL = rawUrl.replace(/\/$/, "");

if (import.meta.env.PROD && (!import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL === "/api")) {
    console.warn(
        "⚠️ VITE_API_URL is missing or defaulting to /api! API calls are going to Vercel instead of your Render backend, causing 405 Method Not Allowed."
    );
}

export const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    try {
        const token = localStorage.getItem("sg_auth_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch {
        /* ignore localStorage errors */
    }
    return config;
});
