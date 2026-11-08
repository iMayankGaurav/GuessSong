// client/src/store/useAuth.js
import { create } from "zustand";
import { api } from "../lib/api";

export const useAuth = create((set) => ({
    user: null,
    loading: true,
    fetchMe: async () => {
        try {
            const { data } = await api.get("/auth/me", { timeout: 4000 });
            if (data && typeof data === "object" && data.user) {
                set({ user: data.user });
            } else {
                set({ user: null });
            }
        } catch {
            set({ user: null });
        } finally {
            set({ loading: false });
        }
    },
    setUser: (user) => set({ user }),
    logout: async () => {
        try {
            await api.post("/auth/logout");
        } catch {
            /* ignore logout network errors */
        }
        set({ user: null });
    },
}));
