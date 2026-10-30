export function formatTime(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`;
}

export function formatMemory(mb: number | null | undefined) {
  return mb == null ? "n/a" : `${mb} MB`;
}

export function formatRelative(iso: string) {
  // The backend stores UTC without a zone marker.
  const date = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return date.toLocaleDateString();
}
