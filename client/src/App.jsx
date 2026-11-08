// client/src/App.jsx
import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { useAuth } from "./store/useAuth";
import { api } from "./lib/api";
import Header from "./components/Header";
import Home from "./pages/Home";
import Play from "./pages/Play";
import Profile from "./pages/Profile";

export default function App() {
    const { fetchMe, setUser, loading } = useAuth();
    const [exchangingAuth, setExchangingAuth] = useState(false);

    useEffect(() => {
        const hash = window.location.hash;
        if (hash && hash.includes("access_token=")) {
            const params = new URLSearchParams(hash.replace(/^#/, ""));
            const accessToken = params.get("access_token");
            if (accessToken) {
                setExchangingAuth(true);
                window.history.replaceState(null, "", window.location.pathname);
                api.post("/auth/google", { access_token: accessToken })
                    .then(({ data }) => {
                        if (data?.token) {
                            try {
                                localStorage.setItem("sg_auth_token", data.token);
                            } catch {
                                /* ignore */
                            }
                        }
                        if (data?.user) {
                            setUser(data.user);
                        }
                    })
                    .catch((err) => {
                        console.error("Redirect login error:", err);
                    })
                    .finally(() => {
                        setExchangingAuth(false);
                    });
                return;
            }
        }
        fetchMe();
    }, [fetchMe, setUser]);

    if (loading || exchangingAuth) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                    <p className="text-sm text-zinc-400">
                        {exchangingAuth ? "Signing you in…" : "Loading Guess the Song…"}
                    </p>
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
