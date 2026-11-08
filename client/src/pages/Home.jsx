// client/src/pages/Home.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../store/useAuth";
import { useGame } from "../store/useGame";

const DEFAULT_CATEGORIES = [
    { id: "bollywood-modern", label: "Modern Bollywood" },
    { id: "bollywood-90s", label: "90s Bollywood" },
    { id: "bollywood-classics", label: "Bollywood Classics" },
    { id: "global-pop", label: "Global Pop" },
    { id: "hip-hop", label: "Hip-Hop" },
];

const MODES = [
    { id: "classic", label: "Classic", desc: "5 songs, ranked" },
    { id: "endless", label: "Endless", desc: "Until you miss, ranked" },
    { id: "casual", label: "Casual", desc: "Keep playing, no pressure, unranked" },
];

export default function Home() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { start, phase, error } = useGame();
    const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
    const [category, setCategory] = useState("bollywood-modern");
    const [mode, setMode] = useState("classic");

    useEffect(() => {
        api.get("/songs/categories")
            .then(({ data }) => {
                if (data && Array.isArray(data.categories) && data.categories.length > 0) {
                    setCategories(data.categories);
                }
            })
            .catch(() => {
                // Keep default categories if backend is waking up
            });
    }, []);

    const play = async () => {
        if (await start({ category, mode })) navigate("/play");
    };

    return (
        <div className="space-y-6">
            {!user && <p className="text-sm text-zinc-400">Log in to save your high score and max streak. Guests can play too.</p>}

            <section>
                <h2 className="mb-2 font-medium">Category</h2>
                <div className="grid grid-cols-2 gap-2">
                    {categories.map((c) => (
                        <button
                            key={c.id}
                            onClick={() => setCategory(c.id)}
                            className={`rounded-lg border px-3 py-3 text-left transition ${category === c.id ? "border-emerald-500 bg-emerald-500/10 text-emerald-300" : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
                                }`}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>
            </section>

            <section>
                <h2 className="mb-2 font-medium">Mode</h2>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {MODES.map((m) => (
                        <button
                            key={m.id}
                            onClick={() => setMode(m.id)}
                            className={`rounded-lg border p-3 text-left transition ${mode === m.id ? "border-emerald-500 bg-emerald-500/10 text-emerald-300" : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
                                }`}
                        >
                            <div className="font-semibold text-zinc-100">{m.label}</div>
                            <div className="text-xs text-zinc-400">{m.desc}</div>
                        </button>
                    ))}
                </div>
            </section>

            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
                onClick={play}
                disabled={phase === "loading"}
                className="w-full rounded-lg bg-emerald-500 py-3 text-lg font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-50"
            >
                {phase === "loading" ? "Loading…" : "Play"}
            </button>
        </div>
    );
}
