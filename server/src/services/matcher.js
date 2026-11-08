// server/src/services/matcher.js
export const clean = (s = "") =>
    s
        .toLowerCase()
        .replace(/\(.*?\)|\[.*?\]/g, " ")     // (feat. X), [Remastered]
        .replace(/\s-\s.*$/, " ")             // " - Radio Edit", " - Remastered 2011"
        .replace(/[^\p{L}\p{N}\s]/gu, " ")    // punctuation, keeps all scripts
        .replace(/\s+/g, " ")
        .trim();

export function isMatch(guess, answer) {
    if (String(guess.id) === String(answer.id)) return true;
    return (
        clean(guess.title) === clean(answer.title) &&
        clean(guess.artist) === clean(answer.artist)
    );
}