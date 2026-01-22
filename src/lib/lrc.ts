import type { LyricLine } from "../types";

const timeTag = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

function padMs(msStr: string | undefined) {
    if (!msStr) return 0;
    if (msStr.length === 1) return Number(msStr) * 100;
    if (msStr.length === 2) return Number(msStr) * 10;
    return Number(msStr.slice(0, 3));
}

export function parseLRC(lrcText: string): LyricLine[] {
    const lines = lrcText.split(/\r?\n/);
    const out: Array<{ startMs: number; text: string }> = [];

    for (const line of lines) {
        const tags: number[] = [];
        let m: RegExpExecArray | null;

        timeTag.lastIndex = 0;
        while ((m = timeTag.exec(line)) !== null) {
            const mm = Number(m[1]);
            const ss = Number(m[2]);
            const ms = padMs(m[3]);
            tags.push(mm * 60_000 + ss * 1000 + ms);
        }

        const text = line.replace(timeTag, "").trim();
        if (!tags.length) continue;

        for (const t of tags) out.push({ startMs: t, text });
    }

    out.sort((a, b) => a.startMs - b.startMs);

    // Build stable ids + infer endMs from next line
    const withIds: LyricLine[] = out.map((x, idx) => ({
        id: `${x.startMs}-${idx}`,
        startMs: x.startMs,
        text: x.text,
    }));

    for (let i = 0; i < withIds.length; i++) {
        const cur = withIds[i];
        const next = withIds[i + 1];
        if (next) cur.endMs = Math.max(cur.startMs, next.startMs - 1);
    }

    return withIds.filter((l) => l.text.length > 0);
}

export function toLRC(lines: LyricLine[]): string {
    const fmt = (ms: number) => {
        const totalSec = Math.floor(ms / 1000);
        const mm = Math.floor(totalSec / 60);
        const ss = totalSec % 60;
        const cs = Math.floor((ms % 1000) / 10);
        return `[${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}.${String(cs).padStart(2, "0")}]`;
    };

    return lines.map((l) => `${fmt(l.startMs)}${l.text}`).join("\n");
}
