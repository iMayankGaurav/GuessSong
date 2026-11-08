// server/src/services/matcher.js
export const clean = (s = "") =>
    s
        .toLowerCase()
        .replace(/\(.*?\)|\[.*?\]/g, " ")        // (From "Ikkis"), (feat. X), [Remastered]
        .replace(/\s-\s.*$/, " ")                // " - Single", " - Remastered 2011"
        .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")  // punctuation (keeps all scripts, incl. Devanagari marks)
        .replace(/\s+/g, " ")
        .trim();

// "Alka Yagnik & Arijit Singh" -> Set { "alka yagnik", "arijit singh" } (order preserved)
export const artistSet = (s = "") =>
    new Set(
        s.split(/,|&|\band\b|\bfeat\.?|\bft\.?/i).map(clean).filter(Boolean)
    );

export function isMatch(guess, answer) {
    if (String(guess.id) === String(answer.id)) return true;
    if (clean(guess.title) !== clean(answer.title)) return false;

    const guessArtists = artistSet(guess.artist);
    for (const name of artistSet(answer.artist)) {
        if (guessArtists.has(name)) return true;   // at least one shared artist
    }
    return false;
}