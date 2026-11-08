// client/src/App.jsx
import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useAuth } from "./store/useAuth";
import Header from "./components/Header";
import Home from "./pages/Home";
import Play from "./pages/Play";
import Profile from "./pages/Profile";

export default function App() {
    const { fetchMe, loading } = useAuth();
    useEffect(() => { fetchMe(); }, [fetchMe]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                    <p className="text-sm text-zinc-400">Loading Guess the Song…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100">
            <div className="mx-auto max-w-xl p-4">
                <Header />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/play" element={<Play />} />
                    <Route path="/profile" element={<Profile />} />
                </Routes>
            </div>
        </div>
    );
}
