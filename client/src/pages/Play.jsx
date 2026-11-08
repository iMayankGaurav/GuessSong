// client/src/pages/Play.jsx
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useGame } from "../store/useGame";
import { useAuth } from "../store/useAuth";
import StageBar from "../components/StageBar";
import GuessBox from "../components/GuessBox";

export default function Play() {
    const navigate = useNavigate();
    const g = useGame();
    const user = useAuth((s) => s.user);
    const [confirmEnd, setConfirmEnd] = useState(false);

    if (!g.token) return <Navigate to="/" replace />;

    const isCasual = g.mode === "casual";
    const roundLabel = isCasual
        ? `Casual · Round ${g.round}`
        : g.mode === "endless"
            ? `Round ${g.round}`
            : `Round ${g.round}/${g.totalRounds}`;

    const isLastClassicRound = g.mode === "classic" && g.round >= g.totalRounds;

    const handleEndSession = async () => {
        setConfirmEnd(false);
        await g.endSession();
    };

    if (g.phase === "finished") {
        const s = g.summary || {};
        const isCasualSummary = s.casual || isCasual;
        return (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold">{isCasualSummary ? "Session ended" : "Game over"}</h2>
                <p className="text-lg">
                    Score <b>{s.totalScore ?? g.totalScore}</b> · Best streak <b>{s.maxStreak ?? g.maxStreak}</b>
                </p>
                <ul className="space-y-2">
                    {(s.rounds || []).map((r, i) => (
                        <li key={i} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5">
                            {r.cover ? (
                                <img src={r.cover} alt="" className="h-10 w-10 rounded object-cover" />
                            ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded bg-zinc-800 text-xs">🎵</div>
                            )}
                            <div className="min-w-0 flex-1 text-sm">
                                <div className="truncate font-medium">{r.title}</div>
                                <div className="truncate text-xs text-zinc-400">{r.artist}</div>
                            </div>
                            <div className={`text-sm font-semibold ${r.solved ? "text-emerald-400" : "text-red-400"}`}>
                                {r.solved ? `✓ ${r.points} (${g.stages[r.stage] ?? ""}s)` : "✗"}
                            </div>
                        </li>
                    ))}
                </ul>
                <p className="text-sm text-zinc-400">
                    {isCasualSummary
                        ? "Casual mode is unranked — session stats are not added to high scores."
                        : s.saved
                            ? "Saved to your profile."
                            : "Log in next time to save your scores."}
                </p>
                <button
                    onClick={() => { g.reset(); navigate("/"); }}
                    className="w-full rounded-lg bg-emerald-500 py-3 font-semibold text-black transition hover:bg-emerald-400"
                >
                    Play again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between text-sm text-zinc-400">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-200">{roundLabel}</span>
                    {isCasual && (
                        confirmEnd ? (
                            <span className="flex items-center gap-1.5 text-xs">
                                <span className="text-zinc-300">End session?</span>
                                <button
                                    onClick={handleEndSession}
                                    className="font-medium text-red-400 hover:text-red-300 underline"
                                >
                                    Yes
                                </button>
                                <button
                                    onClick={() => setConfirmEnd(false)}
                                    className="text-zinc-500 hover:text-zinc-300 underline"
                                >
                                    Cancel
                                </button>
                            </span>
                        ) : (
                            <button
                                onClick={() => setConfirmEnd(true)}
                                className="rounded border border-zinc-700/80 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                            >
                                End session
                            </button>
                        )
                    )}
                </div>
                <span>Streak {g.streak} · Score {g.totalScore}</span>
            </div>

            {g.phase === "loading" && <p className="py-10 text-center text-zinc-400">Loading round…</p>}

            {g.phase === "error" && (
                <div className="space-y-3 py-6 text-center">
                    <p className="text-red-400">{g.error}</p>
                    <button onClick={g.loadRound} className="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-black">
                        Retry
                    </button>
                </div>
            )}

            {g.phase === "playing" && (
                <>
                    <StageBar stages={g.stages} stage={g.stage} guesses={g.guesses} />
                    <button
                        onClick={g.play}
                        disabled={g.isPlaying}
                        className="w-full rounded-lg border border-emerald-500 py-3.5 text-lg font-medium transition hover:bg-emerald-500/10 disabled:opacity-60"
                    >
                        {g.isPlaying ? "Playing…" : `▶ Play ${g.stages[g.stage]}s clip`}
                    </button>
                    <GuessBox />
                    {g.error && <p className="text-sm text-red-400">{g.error}</p>}
                </>
            )}

            {g.phase === "revealed" && g.result && (
                <div className="space-y-4 text-center">
                    <p className={`text-xl font-bold ${g.result.correct ? "text-emerald-400" : "text-red-400"}`}>
                        {g.result.correct
                            ? `Correct! +${g.result.points}`
                            : isCasual
                                ? "Missed it, here's the next one!"
                                : "Missed it"}
                    </p>
                    {g.result.answer.cover && (
                        <img src={g.result.answer.cover} alt="" className="mx-auto h-40 w-40 rounded-lg shadow-lg" />
                    )}
                    <div>
                        <div className="text-lg font-semibold">{g.result.answer.title}</div>
                        <div className="text-zinc-400">{g.result.answer.artist}</div>
                    </div>
                    <button
                        onClick={g.playFull}
                        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white"
                    >
                        ▶ Play full preview
                    </button>
                    <button
                        onClick={g.next}
                        disabled={g.busy}
                        className="block w-full rounded-lg bg-emerald-500 py-3 font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-50"
                    >
                        {isLastClassicRound ? "See results" : "Next"}
                    </button>
                    {isCasual ? (
                        <p className="text-xs text-zinc-500">Casual mode is unranked.</p>
                    ) : !user ? (
                        <p className="text-xs text-zinc-500">Playing as guest. Scores won't be saved.</p>
                    ) : null}
                </div>
            )}
        </div>
    );
}
