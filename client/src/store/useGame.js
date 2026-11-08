// client/src/store/useGame.js
import { create } from "zustand";
import { api, API_URL } from "../lib/api";
import { unlock, loadClip, playSlice, stop } from "../audio/engine";
import { useAuth } from "./useAuth";

const errMsg = (e) => {
    if (e?.response?.status === 405) {
        return "Backend URL (VITE_API_URL) is not reaching the frontend. Please verify VITE_API_URL in Vercel Environment Variables and Redeploy.";
    }
    return e?.response?.data?.error || e?.message || "Something went wrong";
};

export const useGame = create((set, get) => ({
    phase: "idle", // idle | loading | playing | revealed | finished | error
    token: null, mode: "classic", category: null, country: "US",
    stages: [], round: 1, totalRounds: 5, stage: 0,
    streak: 0, totalScore: 0,
    guesses: [],     // this round's wrong guesses / skips
    result: null,    // { correct, points, answer } when a round ends
    summary: null,   // final results
    isPlaying: false,
    busy: false,
    error: null,

    start: async ({ category, mode }) => {
        stop();
        set({ phase: "loading", error: null, summary: null, result: null, guesses: [], isPlaying: false });
        try {
            await unlock();
            const { data } = await api.post("/game/start", { category, mode });
            set({
                token: data.token, mode: data.mode, category: data.category, country: data.country,
                stages: data.stages, round: data.round, totalRounds: data.totalRounds,
                stage: data.stage, streak: data.streak, totalScore: data.totalScore,
            });
            await get().loadRound();
            return true;
        } catch (e) {
            set({ phase: "idle", error: errMsg(e) });
            return false;
        }
    },

    loadRound: async () => {
        set({ phase: "loading", error: null, guesses: [], result: null, isPlaying: false });
        try {
            await loadClip(`${API_URL}/game/${get().token}/audio`);
            set({ phase: "playing" });
            get().play();
        } catch {
            set({ phase: "error", error: "Couldn't load the audio for this round." });
        }
    },

    play: () => {
        const { stages, stage } = get();
        set({ isPlaying: true });
        playSlice(stages[stage], () => set({ isPlaying: false }));
    },

    playFull: () => {
        set({ isPlaying: true });
        playSlice(999, () => set({ isPlaying: false }));
    },

    submit: async (kind, track) => {
        const { token, busy } = get();
        if (busy) return;
        set({ busy: true, error: null });
        try {
            const { data } =
                kind === "guess"
                    ? await api.post(`/game/${token}/guess`, { id: track.id, title: track.title, artist: track.artist })
                    : await api.post(`/game/${token}/skip`);

            stop();
            set({
                stage: data.stage, streak: data.streak, totalScore: data.totalScore, isPlaying: false,
                guesses: [
                    ...get().guesses,
                    kind === "guess" ? { text: `${track.title} · ${track.artist}` } : { skipped: true },
                ],
            });

            if (data.roundOver) {
                set({ phase: "revealed", result: { correct: data.correct, points: data.points, answer: data.answer } });
            } else {
                get().play(); // next, longer clip
            }
        } catch (e) {
            set({ error: errMsg(e) });
        } finally {
            set({ busy: false });
        }
    },

    guess: (track) => get().submit("guess", track),
    skip: () => get().submit("skip"),

    next: async () => {
        if (get().busy) return;
        stop();
        set({ busy: true, error: null, isPlaying: false });
        try {
            const { data } = await api.post(`/game/${get().token}/next`);
            if (data.finished) {
                set({ phase: "finished", summary: data });
                if (data.saved) useAuth.getState().fetchMe(); // refresh high score / max streak
            } else {
                set({
                    round: data.round, totalRounds: data.totalRounds, stage: data.stage,
                    streak: data.streak, totalScore: data.totalScore,
                });
                await get().loadRound();
            }
        } catch (e) {
            set({ error: errMsg(e) });
        } finally {
            set({ busy: false });
        }
    },

    endSession: async () => {
        if (get().busy) return;
        stop();
        set({ busy: true, error: null, isPlaying: false });
        try {
            const { data } = await api.post(`/game/${get().token}/end`);
            set({ phase: "finished", summary: data });
        } catch (e) {
            set({ error: errMsg(e) });
        } finally {
            set({ busy: false });
        }
    },

    reset: () => {
        stop();
        set({ phase: "idle", token: null, isPlaying: false, result: null, summary: null });
    },
}));