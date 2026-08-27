export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function formatDate(iso) {
  if (!iso) return "no date";
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

export function daysUntil(iso) {
  if (!iso) return null;
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(`${iso}T00:00:00Z`).getTime();
  return Math.round((target - todayUtc) / (1000 * 60 * 60 * 24));
}

export function isValidDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
}

const STATUS_GLYPH = { todo: "⬜", "in-progress": "🔵", blocked: "🔴", done: "✅" };
const PRIORITY_GLYPH = { low: "🟢", medium: "🟡", high: "🟠" };

export function statusGlyph(status) {
  return STATUS_GLYPH[status] || "⬜";
}

export function priorityGlyph(priority) {
  return PRIORITY_GLYPH[priority] || "";
}

export function userLabel(user) {
  if (!user) return "unassigned";
  return user.username ? `@${user.username}` : user.firstName || `user ${user.id}`;
}
