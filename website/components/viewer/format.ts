export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "always" });

/** "in 2 days", "in 5 hours", "in 3 minutes" (rounded down, minimum 1 minute). */
export function formatTimeUntil(target: number, now: number): string {
  const diff = target - now;
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return rtf.format(minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return rtf.format(hours, "hour");
  return rtf.format(Math.floor(hours / 24), "day");
}

export function formatAbsolute(target: number): string {
  return new Date(target).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function downloadName(title: string | undefined): string {
  const base = (title || "capto-recording")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return `${base || "capto-recording"}.mp4`;
}
