export type LyricLine = {
    id: string;
    startMs: number;
    endMs?: number; // optional; if missing we infer from next line
    text: string;
};

export type Song = {
    id: string;
    title: string;
    artist?: string;
    album?: string;
    coverUrl?: string;
    videoUrl?: string;
    audioUrl: string; // public path or remote URL
    lyrics: LyricLine[];
};
