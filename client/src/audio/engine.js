// client/src/audio/engine.js
let ctx;
let buffer = null;
let current = null;

const getCtx = () =>
    (ctx ??= new (window.AudioContext || window.webkitAudioContext)());

// Must be called from a click handler (browsers block audio until a user gesture)
export async function unlock() {
    const c = getCtx();
    if (c.state === "suspended") await c.resume();
}

export async function loadClip(url) {
    stop();
    const res = await fetch(url);
    if (!res.ok) throw new Error("Audio request failed");
    buffer = await getCtx().decodeAudioData(await res.arrayBuffer());
}

export function stop() {
    const src = current;
    current = null; // cleared first so its onended callback is ignored
    try { src?.stop(); } catch { /* already stopped */ }
}

// Plays exactly `seconds` from the start of the decoded buffer
export function playSlice(seconds, onEnd) {
    if (!buffer) return;
    stop();
    const c = getCtx();
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.connect(c.destination);
    src.onended = () => {
        if (current === src) { current = null; onEnd?.(); }
    };
    src.start(0, 0, Math.min(seconds, buffer.duration));
    current = src;
}