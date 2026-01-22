export function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

export function formatTime(seconds: number) {
    if (!Number.isFinite(seconds)) return "0:00";
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
}

export function msToSec(ms: number) {
    return ms / 1000;
}

export function secToMs(sec: number) {
    return Math.round(sec * 1000);
}
