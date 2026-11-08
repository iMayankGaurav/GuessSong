// client/src/components/ActivityHeatmap.jsx
import { useMemo, useRef, useEffect, useState } from "react";

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function formatTooltipDate(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
}

function getIntensity(rounds) {
    if (!rounds || rounds <= 0) return "bg-zinc-800/80 hover:ring-zinc-600";
    if (rounds <= 2) return "bg-emerald-950 text-emerald-300 border border-emerald-900/40 hover:ring-emerald-700";
    if (rounds <= 5) return "bg-emerald-800 text-white hover:ring-emerald-500";
    if (rounds <= 9) return "bg-emerald-600 text-white hover:ring-emerald-400";
    return "bg-emerald-400 text-black hover:ring-emerald-300";
}

export default function ActivityHeatmap({ heatmap = { days: [], from: "", to: "" } }) {
    const scrollContainerRef = useRef(null);
    const [tooltip, setTooltip] = useState(null);

    const { days = [], to = "" } = heatmap;

    const dataMap = useMemo(() => {
        const m = new Map();
        for (const d of days) {
            m.set(d.date, d);
        }
        return m;
    }, [days]);

    const totalRounds = useMemo(() => {
        return days.reduce((sum, d) => sum + (d.rounds || 0), 0);
    }, [days]);

    // Build 53 weeks ending on the current week's Sunday
    const { weeks, monthLabels } = useMemo(() => {
        const endDate = to ? new Date(to + "T00:00:00Z") : new Date();
        const endDayOfWeek = (endDate.getUTCDay() + 6) % 7; // 0=Mon, 6=Sun
        const endSunday = new Date(endDate.getTime() + (6 - endDayOfWeek) * 86400000);

        const startMonday = new Date(endSunday.getTime() - (53 * 7 - 1) * 86400000);

        const wks = [];
        const mLabels = [];
        let curr = new Date(startMonday);
        let lastMonth = -1;

        for (let w = 0; w < 53; w++) {
            const weekDays = [];
            const weekMonday = new Date(curr);

            if (weekMonday.getUTCMonth() !== lastMonth) {
                lastMonth = weekMonday.getUTCMonth();
                const mName = weekMonday.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
                mLabels.push({ weekIndex: w, label: mName });
            }

            for (let d = 0; d < 7; d++) {
                const dateStr = formatDate(new Date(curr));
                const isFuture = curr > endDate;
                const activity = dataMap.get(dateStr);

                weekDays.push({
                    date: dateStr,
                    isFuture,
                    rounds: activity?.rounds || 0,
                    solved: activity?.solved || 0,
                    points: activity?.points || 0,
                });

                curr = new Date(curr.getTime() + 86400000);
            }
            wks.push(weekDays);
        }

        return { weeks: wks, monthLabels: mLabels };
    }, [to, dataMap]);

    // Scroll to the right end on load
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
        }
    }, [weeks]);

    return (
        <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium text-zinc-100">
                    {totalRounds} {totalRounds === 1 ? "round" : "rounds"} in the last year
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <span>Less</span>
                    <span className="h-2.5 w-2.5 rounded-sm bg-zinc-800" />
                    <span className="h-2.5 w-2.5 rounded-sm bg-emerald-950 border border-emerald-900/60" />
                    <span className="h-2.5 w-2.5 rounded-sm bg-emerald-800" />
                    <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" />
                    <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
                    <span>More</span>
                </div>
            </div>

            <div className="relative">
                <div
                    ref={scrollContainerRef}
                    className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700"
                >
                    <div className="min-w-[700px] select-none">
                        {/* Month labels */}
                        <div className="relative mb-1 flex h-4 text-[10px] text-zinc-400 pl-7">
                            {monthLabels.map((m, i) => (
                                <span
                                    key={i}
                                    className="absolute"
                                    style={{ left: `${28 + m.weekIndex * 13}px` }}
                                >
                                    {m.label}
                                </span>
                            ))}
                        </div>

                        <div className="flex gap-1.5">
                            {/* Day of week labels */}
                            <div className="flex flex-col justify-between py-0.5 text-[10px] text-zinc-500 w-5 text-left leading-none">
                                <span>Mon</span>
                                <span>&nbsp;</span>
                                <span>Wed</span>
                                <span>&nbsp;</span>
                                <span>Fri</span>
                                <span>&nbsp;</span>
                                <span>&nbsp;</span>
                            </div>

                            {/* 53-week columns */}
                            <div className="flex gap-1">
                                {weeks.map((week, wIdx) => (
                                    <div key={wIdx} className="flex flex-col gap-1">
                                        {week.map((cell) => {
                                            if (cell.isFuture) {
                                                return <div key={cell.date} className="h-2.5 w-2.5" />;
                                            }

                                            const formatted = formatTooltipDate(cell.date);
                                            const label = `${cell.rounds} ${cell.rounds === 1 ? "round" : "rounds"}, ${cell.solved} solved on ${formatted}`;

                                            return (
                                                <button
                                                    key={cell.date}
                                                    type="button"
                                                    tabIndex={0}
                                                    aria-label={label}
                                                    className={`h-2.5 w-2.5 rounded-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 ${getIntensity(
                                                        cell.rounds
                                                    )}`}
                                                    onMouseEnter={(e) => {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setTooltip({
                                                            text: label,
                                                            x: rect.left + rect.width / 2,
                                                            y: rect.top - 8,
                                                        });
                                                    }}
                                                    onMouseLeave={() => setTooltip(null)}
                                                    onFocus={(e) => {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setTooltip({
                                                            text: label,
                                                            x: rect.left + rect.width / 2,
                                                            y: rect.top - 8,
                                                        });
                                                    }}
                                                    onBlur={() => setTooltip(null)}
                                                />
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {tooltip && (
                    <div
                        role="tooltip"
                        style={{
                            left: tooltip.x,
                            top: tooltip.y,
                            transform: "translate(-50%, -100%)",
                        }}
                        className="pointer-events-none fixed z-50 rounded bg-zinc-950 px-2 py-1 text-xs font-medium text-zinc-100 shadow-xl border border-zinc-700 whitespace-nowrap"
                    >
                        {tooltip.text}
                    </div>
                )}
            </div>
        </div>
    );
}

