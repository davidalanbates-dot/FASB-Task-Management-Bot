# FASB Task Management Bot

A multi-user Telegram bot for tracking FASB Accounting Standards Updates
(ASUs) and the implementation tasks they require. It's a **shared
workspace**: every registered user can see and act on everyone's tasks —
claim them, reassign them, update status/due dates — there's no
per-user privacy.

## Setup

### 1. Create a bot with @BotFather

1. Open Telegram and message [@BotFather](https://t.me/BotFather).
2. Send `/newbot` and follow the prompts (choose a name and a username
   ending in `bot`).
3. BotFather replies with an **API token** — copy it.

### 2. Configure and run

```bash
npm install
cp .env.example .env
# paste your token into .env: TELEGRAM_BOT_TOKEN=...
npm start
```

The bot runs via long polling — no public URL or webhook needed. Every
user who wants to use it sends `/start` to the bot in Telegram first;
that registers them so others can `/assign` tasks to them and so they
receive the daily digest.

Run `npm run dev` instead of `npm start` during development to
auto-restart on file changes.

## Commands

**Standards**
- `/timeline` — all FASB ASUs by effective date
- `/asu 2023-09` — details for one ASU, plus its linked tasks
- `/addasu 2025-05 | Title | due:2027-06-30 | topic:Topic 123 | summary:...` — add a new ASU

**Tasks** (shared — everyone sees everyone's)
- `/tasks [status]` — list tasks, optionally filtered by `todo` / `in-progress` / `blocked` / `done`
- `/mytasks` — tasks assigned to you
- `/newtask Title | asu:2023-09 | due:2026-10-01 | priority:high | assignee:@bob` — create a task (only the title is required)
- `/claim t0001` — assign a task to yourself
- `/assign t0001 @bob` — assign a task to a registered user
- `/status t0001 in-progress` — update status
- `/due t0001 2026-12-01` — update a task's due date

**Other**
- `/users` — everyone registered in this workspace
- `/digest` — your personal due/overdue tasks + upcoming ASUs, on demand
- `/help` — list of all commands

## Reminders

A daily digest runs on a cron schedule (default 13:00 UTC) and DMs each
registered user their overdue/due-soon tasks plus any ASUs becoming
effective soon. Configure the schedule via `REMINDER_CRON` /
`REMINDER_TZ` in `.env` — see `.env.example` for all options. Use
`/digest` any time to preview it without waiting for the schedule.

## Data

Everything (`users`, `asus`, `tasks`) is persisted to a single JSON file
at `src/data/db.json` — no external database required. It ships seeded
with a starter set of well-known FASB ASUs (revenue recognition, leases,
CECL, segment reporting, income tax disclosures, etc.). Effective dates
are illustrative starting points — verify current effective dates
against [fasb.org](https://fasb.org) and add/edit ASUs with `/addasu`
as needed.

## Project layout

```
src/
  index.js      entrypoint: loads env, launches the bot, schedules reminders
  bot.js        Telegraf command handlers
  reminders.js  daily digest logic (cron + on-demand /digest)
  store.js      data access layer over src/data/db.json
  format.js     date/HTML/emoji formatting helpers
  data/db.json  persisted data (users, asus, tasks)
```
