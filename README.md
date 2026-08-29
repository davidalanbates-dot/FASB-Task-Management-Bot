# FASB Task Management Bot

Two Telegram bots, each running live on [Make.com](https://make.com) as a
set of scenarios (visual automations) — not as a Node/Python/etc. process
you start yourself. This repo exists as **documentation and
version-controlled backups** of that Make.com system — see
[Editing the live system](#editing-the-live-system) below for how changes
actually get made.

## The two bots

- **Cherry 2000** — private personal assistant. Message it 1:1 and it
  remembers facts about you, sets/cancels personal reminders, and also
  manages a shared FASB (Financial Accounting Standards Board) task
  tracker: track FASB Accounting Standards Updates (ASUs) and
  implementation tasks against them — create tasks, claim them, assign
  them to a teammate, update status, get a daily digest of what's due.
  Facts and personal reminders stay private to your own chat; the FASB
  task list is shared with everyone who's messaged the bot.
- **Astrid** — central/team assistant. A separate bot with its own
  Telegram connection and its own data, entirely independent of Cherry
  2000's data. Talks to team members 1:1 but keeps a directory of
  everyone who's messaged it, so people can create tasks, facts, and
  reminders for named colleagues ("remind Bob to..."), not just
  themselves. Ownership is enforced — you can only edit a task, fact, or
  reminder you're a party to.

Both are powered by Claude and respond conversationally, no slash
commands needed.

## System architecture

Four Make.com scenarios, two separate Telegram bot connections:

| Scenario | Bot | Trigger | Purpose |
|---|---|---|---|
| **Personal Assistant - Chat** (`5997955`) | Cherry 2000 | Telegram message (instant) | Main conversation loop: calls Claude, executes whatever action it decides on (remember/remind/cancel/add_task/claim_task/assign_task/update_status), replies |
| **Personal Assistant - Reminder Dispatcher** (`5998332`) | Cherry 2000 | Scheduled, hourly | Sends any personal reminder whose due time has passed, then deletes it |
| **Personal Assistant - Task Digest** (`6067454`) | Cherry 2000 | Scheduled, daily at 08:00 (org timezone — see note below) | DMs each registered user their FASB tasks due within 3 days (or overdue) |
| **Astrid** (`6080460`) | Astrid | Telegram message (instant) | Full conversation loop: facts, tasks, and reminders for the sender or a named colleague, directory-based delegation, ownership checks |

> **Known gap:** there is currently no scheduled dispatcher scenario for
> Astrid's reminders — the `Astrid Reminders` data store holds them, but
> nothing sends or clears them yet. Cherry 2000's hourly Reminder
> Dispatcher only reads the `Memory` store, not Astrid's stores. Until a
> dispatcher scenario is built for Astrid, reminders set through her won't
> actually fire.

> **Timezone note:** the Task Digest is scheduled in the Make
> organization's account timezone (America/New_York), while both bots'
> own personas and reminder-time parsing are written for Kuala Lumpur
> (GMT+8). If 08:00 local isn't landing at the right time for you, adjust
> the schedule in Make's scenario editor (or ask to have it changed).

Blueprint exports live in [`make/`](./make) for reference and diffing —
see [Editing the live system](#editing-the-live-system) for how to keep
them in sync with what's actually deployed. As of this writing those
exports reflect an earlier, pre-split version of the system and need
refreshing against the live scenarios above.

## Data model

Cherry 2000 and Astrid use completely separate Make Data Stores — nothing
is shared between them.

**Cherry 2000:**
- **Memory** — personal facts and reminders, one record kind per row
  (`kind: "fact"` or `kind: "reminder"`), scoped by `chat_id`.
- **FASB Bot Users** — every person who has messaged the bot: `chat_id`
  (record key), `username`, `first_name`, `last_seen`.
- **FASB Tasks** — implementation tasks: `task_id` (record key), `title`,
  `description`, `status` (todo/in-progress/blocked/done), `priority`
  (low/medium/high), `assignee_chat_id`, `assignee_username`,
  `created_by_chat_id`, `created_by_username`, `due_date`, `created_at`,
  `updated_at`.
- **Personal Assistant Chat History** — recent conversation log per chat,
  used to give Claude short-term memory of what was just said.
- **FASB ASUs** *(currently unused — no live scenario reads or writes it,
  ASU tracking was stripped out of the chat flow)* — accounting standards
  being tracked: `number` (record key, e.g. `2023-09`), `title`, `topic`,
  `summary`, `public_effective_date`, `other_effective_date`, `url`,
  `tags`.

**Astrid:**
- **Astrid Users** — the directory used for delegation (matching a name
  to a `chat_id`).
- **Astrid Memory** — facts, scoped per person.
- **Astrid Tasks** — shared tasks, assignable to any registered user.
- **Astrid Reminders** — reminders, targetable at any registered user (see
  the dispatcher gap noted above).
- **Astrid Chat History** — recent conversation log per chat, for
  short-term memory.

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
