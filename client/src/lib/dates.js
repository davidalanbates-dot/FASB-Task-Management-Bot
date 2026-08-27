export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function isPast(iso) {
  if (!iso) return false;
  return new Date(`${iso}T00:00:00`).getTime() < Date.now();
}

export function daysUntil(iso) {
  if (!iso) return null;
  const ms = new Date(`${iso}T00:00:00`).getTime() - Date.now();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}
