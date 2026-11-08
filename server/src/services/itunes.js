// server/src/services/itunes.js
import { CATEGORIES } from "../config/categories.js";
import { clean, artistSet } from "./matcher.js";

const POOL_TTL = 12 * 60 * 60 * 1000;
const SEARCH_TTL = 10 * 60 * 1000;
const poolCache = new Map();   // categoryId -> { at, tracks }
const searchCache = new Map(); // "IN|query" -> { at, results }

async function it(term, country, limit) {
    const url = new URL("https://itunes.apple.com/search");
    url.search = new URLSearchParams({
        term, country, media: "music", entity: "song", limit: String(limit),
    });
    const res = await fetch(url);
    if (res.status === 403 || res.status === 429) throw new Error("iTunes rate limit hit");
    if (!res.ok) throw new Error(`iTunes HTTP ${res.status}`);
    return (await res.json()).results ?? [];
}

const slim = (t) => ({
    id: String(t.trackId),
    title: t.trackName,
    artist: t.artistName,
    cover: t.artworkUrl100?.replace("100x100", "300x300"),
    thumb: t.artworkUrl60 || t.artworkUrl100 || t.artworkUrl30,
    previewUrl: t.previewUrl,
});

export async function getPool(categoryId) {
    if (!Object.hasOwn(CATEGORIES, categoryId)) throw new Error("Unknown category");
    const cached = poolCache.get(categoryId);
    if (cached && Date.now() - cached.at < POOL_TTL) return cached.tracks;

    const cat = CATEGORIES[categoryId];
    const batches = await Promise.all(
        cat.artists.map(async (artist) => {
            const withPreview = (await it(artist, cat.country, 50)).filter((t) => t.previewUrl);
            // keep songs actually credited to this artist, unless that leaves too few
            const own = withPreview.filter((t) => clean(t.artistName).includes(clean(artist)));
            return (own.length >= 5 ? own : withPreview).map(slim);
        })
    );

    const seen = new Set(); // remove duplicate versions of the same song
    const tracks = batches.flat().filter((t) => {
        const key = `${clean(t.title)}|${[...artistSet(t.artist)][0] ?? ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    if (tracks.length < 10) throw new Error(`Pool "${categoryId}" too small (${tracks.length})`);
    poolCache.set(categoryId, { at: Date.now(), tracks }); // only cache good pools
    console.log(`[pool] ${categoryId}: ${tracks.length} tracks`);
    return tracks;
}

// Autocomplete (the preview URL is stripped, the client never needs it)
export async function searchTracks(q, country = "US") {
    const key = `${country}|${q.toLowerCase()}`;
    const hit = searchCache.get(key);
    if (hit && Date.now() - hit.at < SEARCH_TTL) return hit.results;

    const raw = (await it(q, country, 25)).map(slim);
    const seen = new Set();
    const results = [];
    for (const t of raw) {
        const dedupeKey = `${clean(t.title)}|${[...artistSet(t.artist)][0] ?? ""}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        const { previewUrl: _, ...rest } = t;
        results.push(rest);
        if (results.length >= 10) break;
    }

    searchCache.set(key, { at: Date.now(), results });
    if (searchCache.size > 500) searchCache.delete(searchCache.keys().next().value);
    return results;
}

export function pickRandom(arr, n) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, n);
}