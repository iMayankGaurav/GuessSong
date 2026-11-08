// client/src/components/GuessBox.jsx
import { useEffect, useState, useRef } from "react";
import { api } from "../lib/api";
import { useGame } from "../store/useGame";

export default function GuessBox() {
    const { country, guess, skip, busy, stage, stages } = useGame();
    const [text, setText] = useState("");
    const [results, setResults] = useState([]);
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const listRef = useRef(null);

    // Debounced autocomplete (the server's search source is rate limited, so go easy)
    useEffect(() => {
        if (text.trim().length < 3) {
            setResults([]);
            setHighlightIndex(-1);
            return;
        }
        let ignore = false;
        const t = setTimeout(async () => {
            try {
                const { data } = await api.get("/songs/search", { params: { q: text.trim(), country } });
                if (!ignore) {
                    setResults(data.results || []);
                    setHighlightIndex(-1);
                }
            } catch {
                if (!ignore) {
                    setResults([]);
                    setHighlightIndex(-1);
                }
            }
        }, 350);
        return () => {
            ignore = true;
            clearTimeout(t);
        };
    }, [text, country]);

    // Keep highlighted item in view
    useEffect(() => {
        if (highlightIndex >= 0 && listRef.current) {
            const items = listRef.current.children;
            if (items[highlightIndex]) {
                items[highlightIndex].scrollIntoView({ block: "nearest" });
            }
        }
    }, [highlightIndex]);

    const handleSelect = async (track) => {
        if (!track || busy) return;
        setResults([]);
        setHighlightIndex(-1);
        setText("");
        await guess(track);
    };

    const handleKeyDown = (e) => {
        if (results.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightIndex((prev) => (prev + 1) % results.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightIndex((prev) => (prev - 1 + results.length) % results.length);
        } else if (e.key === "Enter") {
            e.preventDefault();
            const chosen = highlightIndex >= 0 ? results[highlightIndex] : results[0];
            if (chosen) handleSelect(chosen);
        } else if (e.key === "Escape") {
            e.preventDefault();
            setResults([]);
            setHighlightIndex(-1);
        }
    };

    const isLastStage = stages && stage >= stages.length - 1;

    return (
        <div className="space-y-3">
            <div className="relative">
                <input
                    value={text}
                    disabled={busy}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={busy ? "Checking guess…" : "Search for a song…"}
                    className="w-full rounded border border-zinc-700 bg-zinc-900 py-2.5 pl-3 pr-10 text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-emerald-500 disabled:opacity-60"
                />

                {busy && (
                    <div className="absolute right-3 top-3">
                        <svg
                            className="h-5 w-5 animate-spin text-emerald-400"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v8H4z"
                            />
                        </svg>
                    </div>
                )}

                {results.length > 0 && !busy && (
                    <ul
                        ref={listRef}
                        role="listbox"
                        className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-zinc-700 bg-zinc-900 p-1 shadow-2xl shadow-black/80"
                    >
                        {results.map((r, index) => {
                            const isHighlighted = index === highlightIndex;
                            return (
                                <li key={r.id || `${r.title}-${r.artist}-${index}`} role="option" aria-selected={isHighlighted}>
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => handleSelect(r)}
                                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition ${isHighlighted
                                            ? "bg-zinc-800 text-white"
                                            : "text-zinc-200 hover:bg-zinc-800/70"
                                            }`}
                                    >
                                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-zinc-800 text-zinc-600">
                                            {(r.thumb || r.cover) ? (
                                                <img
                                                    src={r.thumb || r.cover}
                                                    alt=""
                                                    loading="lazy"
                                                    className="h-full w-full object-cover"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = "none";
                                                    }}
                                                />
                                            ) : (
                                                <span className="text-xs">🎵</span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm font-medium">{r.title}</div>
                                            <div className="truncate text-xs text-zinc-400">{r.artist}</div>
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {isLastStage ? (
                <button
                    type="button"
                    onClick={skip}
                    disabled={busy}
                    title="Give up and show the answer"
                    className="w-full rounded border border-amber-500/80 bg-amber-500/10 py-2.5 font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-40"
                >
                    Reveal
                </button>
            ) : (
                <button
                    type="button"
                    onClick={skip}
                    disabled={busy}
                    className="w-full rounded border border-zinc-700 bg-zinc-900 py-2.5 font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-40"
                >
                    Skip
                </button>
            )}
        </div>
    );
}
