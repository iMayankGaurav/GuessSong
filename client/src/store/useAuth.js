// client/src/store/useAuth.js
import { create } from "zustand";
import { api } from "../lib/api";

export const useAuth = create((set) => ({
    user: null,
    loading: true,
    fetchMe: async () => {
        try {
            const { data } = await api.get("/auth/me");
            set({ user: data.user });
        } catch {
            set({ user: null });
        } finally {
            set({ loading: false });
        }
    },
    setUser: (user) => set({ user }),
    logout: async () => {
        await api.post("/auth/logout");
        set({ user: null });
    },
}));