# FASB Task Management Bot

A multi-user Telegram personal assistant that also manages a shared FASB
(Financial Accounting Standards Board) task tracker for a team.

**This is not a code deployment.** The bot runs live on
[Make.com](https://make.com) as a set of scenarios (visual automations), not
as a Node/Python/etc. process you start yourself. This repo exists as
**documentation and version-controlled backups** of that Make.com system —
see [Editing the live system](#editing-the-live-system) below for how
changes actually get made.

## What it does

Message the bot on Telegram and it responds like a person, powered by
Claude. Two things live behind that one chat interface:

- **Personal assistant** (private per person): remembers facts you tell it
  and sets/cancels reminders, texting you back when they're due.
- **Shared FASB tracker** (same list for everyone who's messaged the bot):
  track FASB Accounting Standards Updates (ASUs) and implementation tasks
  against them — create tasks, claim them, assign them to a teammate,
  update status, and get a daily digest of what's due.

Facts and reminders stay private to each person's own Telegram chat. FASB
tasks and ASUs are shared — everyone sees and can act on the same lists.

## Talking to it

No slash commands — just talk normally. Examples:

- "add a task to review the CECL disclosures, due Oct 1, high priority"
- "what tasks are open right now"
- "assign t4f2a to bob"
- "mark t4f2a as done"
- "when does ASU 2023-09 take effect"
- "add ASU 2025-05, Title Here, effective 2027-06-30"
- "remind me to call the vet tomorrow at 3pm"

Every registered user (anyone who has sent the bot a message) can see and
act on the full shared task/ASU lists.

## System architecture

Three Make.com scenarios, one shared Telegram bot connection:

| Scenario | Trigger | Purpose |
|---|---|---|
| **Personal Assistant - Chat** | Telegram message (instant) | Main conversation loop: calls Claude, executes whatever action it decides on (remember/remind/cancel/add_task/claim_task/assign_task/update_status/add_asu), replies |
| **Personal Assistant - Reminder Dispatcher** | Scheduled, hourly | Sends any personal reminder whose due time has passed, then deletes it |
| **Personal Assistant - FASB Digest** | Scheduled, daily at 08:00 (org timezone — see note below) | DMs each registered user their tasks due within 3 days (or overdue) plus any ASUs becoming effective within 30 days |

Blueprint exports of all three live in [`make/`](./make) for reference and
diffing — see [Editing the live system](#editing-the-live-system) for how
to keep them in sync with what's actually deployed.

> **Timezone note:** the digest is scheduled in the Make organization's
> account timezone (America/New_York), while the assistant's own persona
> and reminder-time parsing are written for Kuala Lumpur (GMT+8). If 08:00
> local isn't landing at the right time for you, adjust the schedule in
> Make's scenario editor (or ask to have it changed).

## Data model

Four Make Data Stores, all on team "My Team":

- **Memory** *(pre-existing)* — personal facts and reminders, one record
  kind per row (`kind: "fact"` or `kind: "reminder"`), scoped by `chat_id`.
- **FASB Bot Users** — every person who has messaged the bot: `chat_id`
  (record key), `username`, `first_name`, `last_seen`. Refreshed on every
  message so `/assign`-by-username always resolves to a current chat id.
- **FASB ASUs** — accounting standards being tracked: `number` (record
  key, e.g. `2023-09`), `title`, `topic`, `summary`,
  `public_effective_date`, `other_effective_date`, `url`, `tags`. Seeded
  with 8 well-known ASUs (revenue recognition, leases, CECL, segment
  reporting, income tax disclosures, etc.) — effective dates are starting
  points, verify against [fasb.org](https://fasb.org) and add more via
  chat ("add ASU ...") as needed.
- **FASB Tasks** — implementation tasks: `task_id` (record key, short
  id), `asu_number`, `title`, `description`, `status`
  (todo/in-progress/blocked/done), `priority` (low/medium/high),
  `assignee_chat_id`, `assignee_username`, `created_by_chat_id`,
  `created_by_username`, `due_date`, `created_at`, `updated_at`.

## How the chat scenario decides what to do

Claude gets, on every message: the current date/time, the sender's known
facts, their open reminders, the full shared FASB task list, and the full
shared ASU list. It either replies in plain text (used for anything
read-only — answering questions, listing tasks) or outputs exactly one
line of raw JSON naming an action, which Make parses and executes:

```
{"remember": "..."}
{"remind": "...", "at": "YYYY-MM-DDTHH:mm:ss"}
{"cancel": "<reminder_id>"}
{"add_task": "title", "asu": "2023-09", "due": "YYYY-MM-DD", "priority": "high"}
{"claim_task": "<task_id>"}
{"assign_task": "<task_id>", "assignee": "username"}
{"update_status": "<task_id>", "status": "todo|in-progress|blocked|done"}
{"add_asu": "2025-05", "title": "...", "due": "YYYY-MM-DD", "topic": "...", "summary": "..."}
```

All fields except the named required ones are optional. Claude is
instructed to always copy `task_id`/reminder ids from the lists it's
given rather than invent them.

## Editing the live system

The Make scenarios are the source of truth — this repo is a mirror, not a
build artifact:

1. Make changes in the [Make.com scenario editor](https://www.make.com/en/login)
   (or via the Make API/MCP tools) directly against team **My Team**
   (org "My Organization").
2. Re-export the updated blueprint (Scenario → ⋮ → Export blueprint, or
   fetch it via the API) and commit the refreshed JSON under `make/` so
   this repo stays a faithful mirror.
3. Data store schema changes (adding a field, etc.) aren't captured in
   scenario blueprints — note them here in the README if they happen.

Do not treat the JSON files under `make/` as something you `npm install`
and run; they're Make.com scenario blueprints, importable back into Make
if you ever need to restore or clone the setup.
