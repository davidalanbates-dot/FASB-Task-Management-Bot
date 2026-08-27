import { Telegraf } from "telegraf";
import * as store from "./store.js";
import { VALID_STATUSES, VALID_PRIORITIES } from "./store.js";
import { escapeHtml, formatDate, daysUntil, isValidDate, statusGlyph, priorityGlyph, userLabel } from "./format.js";
import { buildDigestForUser } from "./reminders.js";

function userIdOf(ctx) {
  return String(ctx.from.id);
}

function commandBody(ctx) {
  return ctx.message.text.replace(/^\/[^\s]+\s*/, "").trim();
}

function parsePipeArgs(raw) {
  return raw.split("|").map((s) => s.trim()).filter(Boolean);
}

function parseFields(parts) {
  const fields = {};
  for (const part of parts) {
    const idx = part.indexOf(":");
    if (idx === -1) continue;
    fields[part.slice(0, idx).trim().toLowerCase()] = part.slice(idx + 1).trim();
  }
  return fields;
}

function chunkMessage(text, maxLen = 3500) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let current = "";
  for (const line of text.split("\n")) {
    if ((current + "\n" + line).length > maxLen) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function replyLong(ctx, text) {
  for (const chunk of chunkMessage(text)) {
    await ctx.reply(chunk, { parse_mode: "HTML", disable_web_page_preview: true });
  }
}

function asuLine(asu) {
  const days = daysUntil(asu.publicEffectiveDate);
  const status = days <= 0 ? "✅ Effective" : `🕒 in ${days}d`;
  return `<b>ASU ${escapeHtml(asu.number)}</b> — ${escapeHtml(asu.title)}\n${status} · ${formatDate(asu.publicEffectiveDate)}`;
}

function taskLine(task, snapshot, { showAssignee = true } = {}) {
  const asu = task.asuId ? snapshot.asus.find((a) => a.id === task.asuId) : null;
  const assignee = task.assigneeId ? snapshot.users.find((u) => u.id === task.assigneeId) : null;
  const bits = [`${statusGlyph(task.status)}${priorityGlyph(task.priority)} <b>${task.id}</b> ${escapeHtml(task.title)}`];
  const meta = [];
  if (asu) meta.push(`ASU ${escapeHtml(asu.number)}`);
  if (showAssignee) meta.push(assignee ? escapeHtml(userLabel(assignee)) : "unassigned");
  if (task.dueDate) meta.push(`due ${formatDate(task.dueDate)}`);
  if (meta.length) bits.push(meta.join(" · "));
  return bits.join("\n");
}

function taskNotFound(id) {
  return `Task <b>${escapeHtml(id)}</b> not found. Use /tasks to see all task IDs.`;
}

export function createBot(token) {
  const bot = new Telegraf(token);

  bot.catch((err, ctx) => {
    console.error(`Error handling update ${ctx.updateType}:`, err);
    ctx.reply("Something went wrong handling that command. Please try again.").catch(() => {});
  });

  bot.start(async (ctx) => {
    await store.upsertUser({
      id: userIdOf(ctx),
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      chatId: ctx.chat.id,
    });
    await ctx.reply(
      "👋 Welcome to the <b>FASB Task Management Bot</b>.\n\n" +
        "This is a shared workspace — every registered user can see and manage everyone's tasks.\n\n" +
        "Send /help to see everything I can do.",
      { parse_mode: "HTML" }
    );
  });

  bot.help((ctx) =>
    ctx.reply(
      [
        "<b>Standards</b>",
        "/timeline — all FASB ASUs by effective date",
        "/asu 2023-09 — details for one ASU",
        "/addasu 2025-05 | Title | due:2027-06-30 | topic:Topic 123 | summary:... — add a new ASU",
        "",
        "<b>Tasks</b> (shared — everyone sees everyone's)",
        "/tasks [status] — list tasks, optionally filtered by todo/in-progress/blocked/done",
        "/mytasks — tasks assigned to you",
        "/newtask Title | asu:2023-09 | due:2026-10-01 | priority:high | assignee:@bob — create a task (only title required)",
        "/claim t0001 — assign a task to yourself",
        "/assign t0001 @bob — assign a task to a registered user",
        "/status t0001 in-progress — update status (todo/in-progress/blocked/done)",
        "/due t0001 2026-12-01 — update a task's due date",
        "",
        "<b>Other</b>",
        "/users — everyone registered in this workspace",
        "/digest — your personal due/overdue tasks + upcoming ASUs, on demand",
      ].join("\n"),
      { parse_mode: "HTML" }
    )
  );

  bot.command("timeline", async (ctx) => {
    const asus = [...(await store.listAsus())].sort((a, b) => a.publicEffectiveDate.localeCompare(b.publicEffectiveDate));
    if (asus.length === 0) return ctx.reply("No ASUs yet. Add one with /addasu.");
    await replyLong(ctx, asus.map(asuLine).join("\n\n"));
  });

  bot.command("asu", async (ctx) => {
    const number = commandBody(ctx);
    if (!number) return ctx.reply("Usage: /asu 2023-09");
    const asu = await store.findAsuByNumber(number);
    if (!asu) return ctx.reply(`ASU ${escapeHtml(number)} not found. Use /timeline to see all ASUs.`, { parse_mode: "HTML" });

    const snapshot = await store.getSnapshot();
    const tasks = snapshot.tasks.filter((t) => t.asuId === asu.id);
    const lines = [
      `<b>ASU ${escapeHtml(asu.number)}</b>${asu.topic ? ` · ${escapeHtml(asu.topic)}` : ""}`,
      escapeHtml(asu.title),
      "",
      asu.summary ? escapeHtml(asu.summary) : "",
      "",
      `Public entities: ${formatDate(asu.publicEffectiveDate)}`,
      asu.otherEffectiveDate !== asu.publicEffectiveDate ? `Other entities: ${formatDate(asu.otherEffectiveDate)}` : "",
      asu.url ? `<a href="${escapeHtml(asu.url)}">FASB.org</a>` : "",
      "",
      `<b>Tasks (${tasks.length})</b>`,
      ...(tasks.length ? tasks.map((t) => taskLine(t, snapshot)) : ["None yet. /newtask Title | asu:" + asu.number]),
    ].filter((l) => l !== "");
    await replyLong(ctx, lines.join("\n"));
  });

  bot.command("addasu", async (ctx) => {
    const parts = parsePipeArgs(commandBody(ctx));
    if (parts.length < 2) {
      return ctx.reply("Usage: /addasu 2025-05 | Title here | due:2027-06-30 | topic:Topic 123 | summary:...");
    }
    const [number, title, ...rest] = parts;
    const fields = parseFields(rest);
    if (!fields.due || !isValidDate(fields.due)) {
      return ctx.reply("Please include a valid due date: due:YYYY-MM-DD (this becomes the public entity effective date).");
    }
    try {
      const asu = await store.addAsu({
        number,
        title,
        publicEffectiveDate: fields.due,
        otherEffectiveDate: fields.other && isValidDate(fields.other) ? fields.other : fields.due,
        topic: fields.topic,
        summary: fields.summary,
        url: fields.url,
        tags: fields.tags ? fields.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      });
      await ctx.reply(`✅ Added <b>ASU ${escapeHtml(asu.number)}</b> — ${escapeHtml(asu.title)}`, { parse_mode: "HTML" });
    } catch (e) {
      await ctx.reply(`Couldn't add that ASU: ${escapeHtml(e.message)}`, { parse_mode: "HTML" });
    }
  });

  bot.command("tasks", async (ctx) => {
    const filter = commandBody(ctx).toLowerCase();
    if (filter && !VALID_STATUSES.includes(filter)) {
      return ctx.reply(`Status must be one of: ${VALID_STATUSES.join(", ")}`);
    }
    const snapshot = await store.getSnapshot();
    const tasks = filter ? snapshot.tasks.filter((t) => t.status === filter) : snapshot.tasks;
    if (tasks.length === 0) return ctx.reply("No tasks match that filter.");

    if (filter) {
      await replyLong(ctx, tasks.map((t) => taskLine(t, snapshot)).join("\n\n"));
      return;
    }
    const sections = VALID_STATUSES.map((status) => {
      const group = tasks.filter((t) => t.status === status);
      if (group.length === 0) return null;
      return `<b>${status} (${group.length})</b>\n\n` + group.map((t) => taskLine(t, snapshot)).join("\n\n");
    }).filter(Boolean);
    await replyLong(ctx, sections.join("\n\n"));
  });

  bot.command("mytasks", async (ctx) => {
    const snapshot = await store.getSnapshot();
    const tasks = snapshot.tasks.filter((t) => t.assigneeId === userIdOf(ctx));
    if (tasks.length === 0) return ctx.reply("You have no tasks assigned. Use /claim <taskId> to take one, or /newtask to create one.");
    await replyLong(ctx, tasks.map((t) => taskLine(t, snapshot, { showAssignee: false })).join("\n\n"));
  });

  bot.command("newtask", async (ctx) => {
    const parts = parsePipeArgs(commandBody(ctx));
    if (parts.length === 0) {
      return ctx.reply("Usage: /newtask Title here | asu:2023-09 | due:2026-10-01 | priority:high | assignee:@bob\n(only the title is required)");
    }
    const [title, ...rest] = parts;
    const fields = parseFields(rest);

    let asuId = null;
    if (fields.asu) {
      const asu = await store.findAsuByNumber(fields.asu);
      if (!asu) return ctx.reply(`ASU ${escapeHtml(fields.asu)} not found. Check /timeline for valid ASU numbers.`, { parse_mode: "HTML" });
      asuId = asu.id;
    }

    let assigneeId = null;
    if (fields.assignee) {
      const user = await store.findUserByUsername(fields.assignee);
      if (!user) return ctx.reply(`${escapeHtml(fields.assignee)} hasn't messaged this bot yet — ask them to send /start first.`, { parse_mode: "HTML" });
      assigneeId = user.id;
    }

    if (fields.due && !isValidDate(fields.due)) {
      return ctx.reply("due date must be in YYYY-MM-DD format.");
    }
    if (fields.priority && !VALID_PRIORITIES.includes(fields.priority)) {
      return ctx.reply(`priority must be one of: ${VALID_PRIORITIES.join(", ")}`);
    }

    const task = await store.addTask({
      asuId,
      title,
      description: fields.description || "",
      priority: fields.priority,
      assigneeId,
      dueDate: fields.due || null,
      createdById: userIdOf(ctx),
    });
    await ctx.reply(`✅ Created task <b>${task.id}</b>: ${escapeHtml(task.title)}`, { parse_mode: "HTML" });
  });

  bot.command("claim", async (ctx) => {
    const id = commandBody(ctx).split(/\s+/)[0];
    if (!id) return ctx.reply("Usage: /claim t0001");
    const task = await store.findTask(id);
    if (!task) return ctx.reply(taskNotFound(id), { parse_mode: "HTML" });
    await store.updateTask(id, { assigneeId: userIdOf(ctx) });
    await ctx.reply(`👍 You're now assigned to <b>${id}</b>: ${escapeHtml(task.title)}`, { parse_mode: "HTML" });
  });

  bot.command("assign", async (ctx) => {
    const [id, mention] = commandBody(ctx).split(/\s+/);
    if (!id || !mention) return ctx.reply("Usage: /assign t0001 @bob");
    const task = await store.findTask(id);
    if (!task) return ctx.reply(taskNotFound(id), { parse_mode: "HTML" });
    const user = await store.findUserByUsername(mention);
    if (!user) return ctx.reply(`${escapeHtml(mention)} hasn't messaged this bot yet — ask them to send /start first.`, { parse_mode: "HTML" });
    await store.updateTask(id, { assigneeId: user.id });
    await ctx.reply(`👍 Assigned <b>${id}</b> to ${escapeHtml(userLabel(user))}`, { parse_mode: "HTML" });
  });

  bot.command("status", async (ctx) => {
    const [id, status] = commandBody(ctx).split(/\s+/);
    if (!id || !status) return ctx.reply(`Usage: /status t0001 <${VALID_STATUSES.join("|")}>`);
    if (!VALID_STATUSES.includes(status)) return ctx.reply(`Status must be one of: ${VALID_STATUSES.join(", ")}`);
    const task = await store.findTask(id);
    if (!task) return ctx.reply(taskNotFound(id), { parse_mode: "HTML" });
    await store.updateTask(id, { status });
    const celebrate = status === "done" ? " 🎉" : "";
    await ctx.reply(`Updated <b>${id}</b> to <b>${status}</b>.${celebrate}`, { parse_mode: "HTML" });
  });

  bot.command("due", async (ctx) => {
    const [id, date] = commandBody(ctx).split(/\s+/);
    if (!id || !date) return ctx.reply("Usage: /due t0001 2026-12-01");
    if (!isValidDate(date)) return ctx.reply("Date must be in YYYY-MM-DD format.");
    const task = await store.findTask(id);
    if (!task) return ctx.reply(taskNotFound(id), { parse_mode: "HTML" });
    await store.updateTask(id, { dueDate: date });
    await ctx.reply(`Updated <b>${id}</b> due date to ${formatDate(date)}.`, { parse_mode: "HTML" });
  });

  bot.command("users", async (ctx) => {
    const users = await store.listUsers();
    if (users.length === 0) return ctx.reply("No one has registered yet.");
    const lines = users
      .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))
      .map((u) => `• ${escapeHtml(userLabel(u))}`);
    await ctx.reply(`<b>Workspace members (${users.length})</b>\n${lines.join("\n")}`, { parse_mode: "HTML" });
  });

  bot.command("digest", async (ctx) => {
    const snapshot = await store.getSnapshot();
    const { text, hasContent } = buildDigestForUser(snapshot, userIdOf(ctx));
    await replyLong(ctx, hasContent ? text : "Nothing overdue or due soon, and no ASUs newly upcoming. 🎉");
  });

  bot.on("text", (ctx) => ctx.reply("I didn't recognize that. Send /help to see available commands."));

  return bot;
}
