import cron from "node-cron";
import { getSnapshot } from "./store.js";
import { escapeHtml, formatDate, daysUntil } from "./format.js";

const TASK_WINDOW_DAYS = Number(process.env.REMINDER_TASK_WINDOW_DAYS || 3);
const ASU_WINDOW_DAYS = Number(process.env.REMINDER_ASU_WINDOW_DAYS || 30);

function taskDigestLine(task, snapshot) {
  const asu = task.asuId ? snapshot.asus.find((a) => a.id === task.asuId) : null;
  const suffix = asu ? ` (ASU ${escapeHtml(asu.number)})` : "";
  return `• <b>${task.id}</b> ${escapeHtml(task.title)}${suffix} — due ${formatDate(task.dueDate)}`;
}

function asuDigestLine(asu) {
  return `• <b>ASU ${escapeHtml(asu.number)}</b> ${escapeHtml(asu.title)} — ${formatDate(asu.publicEffectiveDate)} (in ${daysUntil(asu.publicEffectiveDate)}d)`;
}

/** Pure function: given a full store snapshot and a user id, build that user's digest. */
export function buildDigestForUser(snapshot, userId) {
  const myTasks = snapshot.tasks.filter((t) => t.assigneeId === userId && t.status !== "done" && t.dueDate);
  const overdue = myTasks.filter((t) => daysUntil(t.dueDate) < 0);
  const dueSoon = myTasks.filter((t) => {
    const d = daysUntil(t.dueDate);
    return d >= 0 && d <= TASK_WINDOW_DAYS;
  });
  const upcomingAsus = snapshot.asus.filter((a) => {
    const d = daysUntil(a.publicEffectiveDate);
    return d >= 0 && d <= ASU_WINDOW_DAYS;
  });

  const sections = [];
  if (overdue.length) sections.push(`⚠️ <b>Overdue</b>\n${overdue.map((t) => taskDigestLine(t, snapshot)).join("\n")}`);
  if (dueSoon.length) sections.push(`🔔 <b>Due within ${TASK_WINDOW_DAYS} days</b>\n${dueSoon.map((t) => taskDigestLine(t, snapshot)).join("\n")}`);
  if (upcomingAsus.length) sections.push(`📅 <b>ASUs effective within ${ASU_WINDOW_DAYS} days</b>\n${upcomingAsus.map(asuDigestLine).join("\n")}`);

  return { text: sections.join("\n\n"), hasContent: sections.length > 0 };
}

async function runDailyDigest(bot) {
  const snapshot = await getSnapshot();
  for (const user of snapshot.users) {
    if (!user.chatId) continue;
    const { text, hasContent } = buildDigestForUser(snapshot, user.id);
    if (!hasContent) continue;
    try {
      await bot.telegram.sendMessage(user.chatId, `<b>Daily digest</b>\n\n${text}`, { parse_mode: "HTML" });
    } catch (err) {
      console.error(`Failed to send digest to user ${user.id}:`, err.message);
    }
  }
}

export function scheduleReminders(bot) {
  const expression = process.env.REMINDER_CRON || "0 13 * * *";
  const options = process.env.REMINDER_TZ ? { timezone: process.env.REMINDER_TZ } : {};
  cron.schedule(expression, () => runDailyDigest(bot).catch((err) => console.error("Digest run failed:", err)), options);
  console.log(`Daily digest scheduled with cron "${expression}"${process.env.REMINDER_TZ ? ` (${process.env.REMINDER_TZ})` : " (UTC)"}`);
}
