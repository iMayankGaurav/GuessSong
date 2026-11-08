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

    if (loading) return <p className="p-6 text-zinc-400">Loading…</p>;

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
