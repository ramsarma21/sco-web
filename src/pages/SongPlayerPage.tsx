import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import type { LyricLine, Song } from "../types";
import { sampleSong } from "../data/sampleSong";
import { clamp, formatTime, msToSec, secToMs } from "../lib/time";

function findActiveIndex(lines: LyricLine[], tMs: number) {
    // binary search by startMs
    let lo = 0,
        hi = lines.length - 1,
        ans = -1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (lines[mid].startMs <= tMs) {
            ans = mid;
            lo = mid + 1;
        } else hi = mid - 1;
    }
    if (ans === -1) return -1;
    const endMs = lines[ans].endMs;
    if (typeof endMs === "number" && tMs > endMs) return -1;
    return ans;
}

export default function SongPlayerPage() {
    const { songId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();

    // For demo: only one song; swap to a map if you add multiple
    const song: Song = useMemo(() => {
        if (songId === "sample") return sampleSong;
        return sampleSong;
    }, [songId]);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const [isReady, setIsReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [durationSec, setDurationSec] = useState(0);
    const [tSec, setTSec] = useState(0);

    const [lyrics] = useState<LyricLine[]>(() => {
        // infer endMs for sample if missing
        const MAX_INFER_GAP_MS = 6000;
        const FALLBACK_LINE_DURATION_MS = 2500;
        const copy = song.lyrics.map((l) => ({ ...l }));
        for (let i = 0; i < copy.length; i++) {
            if (!copy[i].endMs && copy[i + 1]) {
                const gap = copy[i + 1].startMs - copy[i].startMs;
                copy[i].endMs = gap <= MAX_INFER_GAP_MS
                    ? copy[i + 1].startMs - 1
                    : copy[i].startMs + FALLBACK_LINE_DURATION_MS;
            }
        }
        return copy;
    });

    // Deep-link time: ?t=73.2
    useEffect(() => {
        const t = searchParams.get("t");
        if (!t) return;
        const sec = Number(t);
        if (!Number.isFinite(sec) || sec < 0) return;
        const a = audioRef.current;
        if (!a) return;
        a.currentTime = sec;
        setTSec(sec);
    }, []); // run once on mount

    const activeIndex = useMemo(() => {
        return findActiveIndex(lyrics, secToMs(tSec));
    }, [lyrics, tSec]);

    const activeLineId = lyrics[activeIndex]?.id;

    function seek(sec: number, alsoUpdateUrl = true) {
        const a = audioRef.current;
        if (!a) return;
        const next = clamp(sec, 0, durationSec || Number.POSITIVE_INFINITY);
        a.currentTime = next;
        if (videoRef.current) {
            videoRef.current.currentTime = next;
        }
        setTSec(next);
        if (alsoUpdateUrl) {
            const sp = new URLSearchParams(searchParams);
            sp.set("t", String(Math.round(next * 10) / 10));
            setSearchParams(sp, { replace: true });
        }
    }

    function togglePlay() {
        const a = audioRef.current;
        if (!a) return;
        if (a.paused) {
            a.play();
            if (videoRef.current) videoRef.current.play();
        } else {
            a.pause();
            if (videoRef.current) videoRef.current.pause();
        }
    }

    return (
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-4 md:gap-8 md:p-8">
            <audio
                ref={audioRef}
                src={song.audioUrl}
                preload="metadata"
                onLoadedMetadata={(e) => {
                    const a = e.currentTarget;
                    setDurationSec(a.duration || 0);
                    setIsReady(true);
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={(e) => setTSec(e.currentTarget.currentTime)}
            />

            <div className="panel media-player animate-rise" style={{ animationDelay: "30ms" }}>
                {song.videoUrl ? (
                    <video
                        ref={videoRef}
                        src={song.videoUrl}
                        poster={song.coverUrl}
                        className="media-video"
                        muted
                        playsInline
                    />
                ) : (
                    <img src={song.coverUrl} alt={`${song.title} video still`} className="media-image" />
                )}
            </div>

            <header className="panel player-card player-card-center animate-rise" style={{ animationDelay: "40ms" }}>
                <div className="player-top">
                    <div>
                        <div className="player-title">{song.title}</div>
                        <div className="player-artist">{song.artist ?? "Unknown artist"}</div>
                    </div>
                    {/* Favorite button removed */}
                </div>

                <div className="player-track">
                    <input
                        type="range"
                        min={0}
                        max={durationSec || 0}
                        step={0.05}
                        value={Number.isFinite(tSec) ? tSec : 0}
                        onChange={(e) => seek(Number(e.target.value), false)}
                        onMouseUp={() => seek(tSec, true)}
                        onTouchEnd={() => seek(tSec, true)}
                        disabled={!isReady}
                        className="track"
                    />
                    <div className="time-row">
                        <span>{formatTime(tSec)}</span>
                        <span>{formatTime(durationSec)}</span>
                    </div>
                </div>

                {/* Controls simplified: ONLY play/pause, centered */}
                <div className="player-controls flex justify-center">
                    <button
                        className="control-btn control-main"
                        type="button"
                        aria-label={isPlaying ? "Pause" : "Play"}
                        onClick={togglePlay}
                    >
                        {isPlaying ? (
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M8 5v14l11-7L8 5z" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Speed + meta buttons removed */}
            </header>

            {activeLineId ? (
                <section className="animate-rise lyrics-panel" style={{ animationDelay: "120ms" }}>
                    <LyricView
                        lines={lyrics}
                        activeLineId={activeLineId}
                        onSeek={(ms) => seek(msToSec(ms))}
                        autoScroll
                        karaokeMode={false}
                        showTimestamps={false}
                        fontScale={1.05}
                        variant="spotify"
                        onlyActive
                    />
                </section>
            ) : null}
        </div>
    );
}

function LyricView(props: {
    lines: LyricLine[];
    activeLineId?: string;
    onSeek: (ms: number) => void;
    autoScroll: boolean;
    karaokeMode: boolean;
    showTimestamps: boolean;
    fontScale: number;
    variant?: "spotify";
    onlyActive?: boolean;
}) {
    const { lines, activeLineId, onSeek, autoScroll, karaokeMode, showTimestamps, fontScale, variant, onlyActive } =
        props;

    const containerRef = useRef<HTMLDivElement | null>(null);
    const activeRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        if (!autoScroll) return;
        if (!activeRef.current || !containerRef.current) return;

        const c = containerRef.current;
        const el = activeRef.current;

        const cRect = c.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const delta = elRect.top + elRect.height / 2 - (cRect.top + cRect.height / 2);

        c.scrollBy({ top: delta, behavior: "smooth" });
    }, [activeLineId, autoScroll]);

    const activeLine = activeLineId ? lines.find((l) => l.id === activeLineId) : undefined;

    return (
        <div
            ref={containerRef}
            className={`lyrics-scroll${variant === "spotify" ? " lyrics-spotify" : ""}`}
            style={{ fontSize: `${fontScale}rem` }}
        >
            <div className="flex flex-col gap-1">
                {(onlyActive ? (activeLine ? [activeLine] : []) : lines).map((l) => {
                    const active = l.id === activeLineId;
                    const base = "lyric-line";
                    const activeCls = karaokeMode ? "is-active is-karaoke" : "is-active";
                    const idleCls = "text-muted";

                    return (
                        <button
                            key={l.id}
                            ref={active ? activeRef : null}
                            onClick={() => onSeek(l.startMs)}
                            className={`${base} ${active ? activeCls : idleCls}`}
                        >
                            <div className="flex items-baseline justify-between gap-3">
                                <div className="leading-snug">{l.text}</div>
                                {showTimestamps ? (
                                    <div className={`text-xs tabular-nums ${active ? "text-quiet" : "text-quiet"}`}>
                                        {formatTime(msToSec(l.startMs))}
                                    </div>
                                ) : null}
                            </div>
                        </button>
                    );
                })}
                {lines.length === 0 ? (
                    <div className="rounded-2xl border border-[color:var(--border)] bg-[rgba(12,16,16,0.7)] p-3 text-sm text-muted">
                        No lyric lines match your search.
                    </div>
                ) : null}
            </div>
        </div>
    );
}
