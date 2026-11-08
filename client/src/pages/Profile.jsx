// client/src/pages/Profile.jsx
import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../store/useAuth";
import { api } from "../lib/api";
import ActivityHeatmap from "../components/ActivityHeatmap";

export default function Profile() {
    const { user, loading: authLoading } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user) return;
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        api
            .get("/profile/me", { params: { tz } })
            .then(({ data }) => setProfile(data))
            .catch((err) => setError(err?.response?.data?.error || "Failed to load profile"))
            .finally(() => setLoading(false));
    }, [user]);

    if (!authLoading && !user) {
        return <Navigate to="/" replace />;
    }

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                    <div className="h-16 w-16 rounded-full bg-zinc-800" />
                    <div className="space-y-2">
                        <div className="h-5 w-40 rounded bg-zinc-800" />
                        <div className="h-4 w-28 rounded bg-zinc-800" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-24 rounded-xl border border-zinc-800 bg-zinc-900/40" />
                    ))}
                </div>
                <div className="h-44 rounded-xl border border-zinc-800 bg-zinc-900/40" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-4 py-8 text-center">
                <p className="text-red-400">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-black transition hover:bg-emerald-400"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!profile) return null;

    const { stats, heatmap, categories = [], recent = [] } = profile;
    const playingSince = profile.user.createdAt
        ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
            new Date(profile.user.createdAt)
        )
        : "Recently";

    const hasActivity = stats.roundsPlayed > 0;

    return (
        <div className="space-y-6">
            {/* User Header Card */}
            <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-800 text-xl font-bold text-zinc-200">
                    {profile.user.avatar ? (
                        <img
                            src={profile.user.avatar}
                            alt=""
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        (profile.user.name?.[0] || "U").toUpperCase()
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-xl font-bold text-zinc-100">{profile.user.name}</h2>
                    <p className="text-sm text-zinc-400">Playing since {playingSince}</p>
                </div>
                <Link
                    to="/"
                    className="rounded-lg border border-zinc-700/80 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
                >
                    Play Now
                </Link>
            </div>

            {/* Main Stats Row */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                    <div className="text-xs font-medium text-zinc-400">High score</div>
                    <div className="mt-1 text-2xl font-bold text-emerald-400">{stats.highScore}</div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                    <div className="text-xs font-medium text-zinc-400">Max streak</div>
                    <div className="mt-1 text-2xl font-bold text-emerald-400">{stats.maxStreak}</div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                    <div className="text-xs font-medium text-zinc-400">Games played</div>
                    <div className="mt-1 text-2xl font-bold text-zinc-100">{stats.gamesPlayed}</div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                    <div className="text-xs font-medium text-zinc-400">Accuracy</div>
                    <div className="mt-1 text-2xl font-bold text-zinc-100">
                        {Math.round(stats.accuracy * 100)}%
                    </div>
                </div>
            </div>

            {/* Second Stats Row */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
                    <div className="text-xs text-zinc-400">Day streak</div>
                    <div className="mt-1 font-semibold text-zinc-200">
                        {stats.currentDayStreak}d <span className="text-xs text-zinc-500 font-normal">(best {stats.longestDayStreak}d)</span>
                    </div>
                </div>
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
                    <div className="text-xs text-zinc-400">Solved in 0.1s</div>
                    <div className="mt-1 font-semibold text-zinc-200">{stats.solvedAtFirstStage}</div>
                </div>
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
                    <div className="text-xs text-zinc-400">Rounds played</div>
                    <div className="mt-1 font-semibold text-zinc-200">{stats.roundsPlayed}</div>
                </div>
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
                    <div className="text-xs text-zinc-400">Favorite category</div>
                    <div className="mt-1 truncate font-semibold text-zinc-200">{stats.favoriteCategory}</div>
                </div>
            </div>

            {/* Heatmap Section */}
            <div>
                <ActivityHeatmap heatmap={heatmap} />
                {!hasActivity && (
                    <p className="mt-2 text-center text-xs text-zinc-500">
                        Play a game to light this up
                    </p>
                )}
            </div>

            {/* Categories Table */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <h3 className="mb-3 font-medium text-zinc-100">Category breakdown</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-zinc-800 text-xs text-zinc-400">
                                <th className="pb-2 font-medium">Category</th>
                                <th className="pb-2 font-medium text-right">Best Score</th>
                                <th className="pb-2 font-medium text-right">Games</th>
                                <th className="pb-2 font-medium text-right">Accuracy</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                            {categories.map((c) => (
                                <tr key={c.id} className="text-zinc-300">
                                    <td className="py-2.5 font-medium text-zinc-200">{c.label}</td>
                                    <td className="py-2.5 text-right font-mono text-emerald-400">{c.bestScore}</td>
                                    <td className="py-2.5 text-right font-mono text-zinc-400">{c.gamesPlayed}</td>
                                    <td className="py-2.5 text-right font-mono">
                                        {Math.round(c.accuracy * 100)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Games */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <h3 className="mb-3 font-medium text-zinc-100">Recent ranked games</h3>
                {recent.length === 0 ? (
                    <p className="py-4 text-center text-sm text-zinc-500">No ranked games completed yet.</p>
                ) : (
                    <ul className="divide-y divide-zinc-800/60">
                        {recent.map((g, idx) => (
                            <li key={idx} className="flex items-center justify-between py-2.5 text-sm">
                                <div>
                                    <div className="font-medium text-zinc-200">
                                        {g.categoryLabel}
                                        <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400">
                                            {g.mode}
                                        </span>
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        {new Date(g.playedAt).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-semibold text-emerald-400">{g.totalScore} pts</div>
                                    <div className="text-xs text-zinc-400">Streak: {g.maxStreak}</div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

