// client/src/components/StageBar.jsx
export default function StageBar({ stages, stage, guesses }) {
    return (
        <div className="space-y-3">
            <div className="flex gap-1">
                {stages.map((s, i) => (
                    <div
                        key={i}
                        className={`flex-1 rounded py-1 text-center text-xs font-medium ${i <= stage ? "bg-emerald-500 text-black" : "bg-zinc-800 text-zinc-500"
                            }`}
                    >
                        {s}s
                    </div>
                ))}
            </div>
            <ul className="space-y-1 text-sm">
                {guesses.map((g, i) => (
                    <li key={i} className="rounded border border-zinc-700 px-3 py-2 text-zinc-300">
                        {g.skipped ? "⏭ Skipped" : `✗ ${g.text}`}
                    </li>
                ))}
            </ul>
        </div>
    );
}