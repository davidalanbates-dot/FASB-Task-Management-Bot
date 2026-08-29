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

Five Make.com scenarios, two separate Telegram bot connections:

| Scenario | Bot | Trigger | Purpose |
|---|---|---|---|
| **Personal Assistant - Chat** (`5997955`) | Cherry 2000 | Telegram message (instant) | Main conversation loop: calls Claude, executes whatever action it decides on (remember/remind/cancel/add_task/claim_task/assign_task/update_status), replies |
| **Personal Assistant - Reminder Dispatcher** (`5998332`) | Cherry 2000 | Scheduled, every 30 minutes | Sends any personal reminder whose due time has passed, then deletes it |
| **Personal Assistant - Task Digest** (`6067454`) | Cherry 2000 | Scheduled, daily at 08:00 (org timezone — see note below) | DMs each registered user their FASB tasks due within 3 days (or overdue) |
| **Astrid** (`6080460`) | Astrid | Telegram message (instant) | Full conversation loop: facts, tasks, and reminders for the sender or a named colleague, directory-based delegation, ownership checks |
| **Astrid - Reminder Dispatcher** (`6089137`) | Astrid | Scheduled, every 30 minutes | Sends any pending reminder in `Astrid Reminders` whose due time has passed, then deletes it |

Both bots' reminder dispatchers now run on the same 30-minute cadence
(:00 and :30), and both bots' system prompts say so — Cherry 2000 and
Astrid each tell people reminders go out on that grid rather than
instantly, so what the bot says matches what actually happens.

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
- **Astrid Reminders** — reminders, targetable at any registered user;
  cleared by the Astrid - Reminder Dispatcher scenario every 30 minutes.
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

## Rolling back a change

Every scenario's blueprint lives under `make/` and every version of it is
in git history — that's the rollback mechanism, there's no separate
backup system to maintain:

| File | Scenario | ID |
|---|---|---|
| `personal-assistant-chat.blueprint.json` | Personal Assistant - Chat | `5997955` |
| `personal-assistant-reminder-dispatcher.blueprint.json` | Personal Assistant - Reminder Dispatcher | `5998332` |
| `personal-assistant-fasb-digest.blueprint.json` | Personal Assistant - Task Digest | `6067454` |
| `astrid-chat.blueprint.json` | Astrid | `6080460` |
| `astrid-reminder-dispatcher.blueprint.json` | Astrid - Reminder Dispatcher | `6089137` |

To undo a bad change:

1. Find the last-known-good version with `git log -p -- make/<file>` (or
   `git show <commit>:make/<file>` to view one version without checking
   it out).
2. Push that historical blueprint back to the live scenario — via the
   Make scenario editor (Scenario → ⋮ → Import blueprint, paste the old
   JSON) or by asking Claude to do it, which calls
   `scenarios_update` with that scenario ID and the old blueprint content
   as-is.
3. Commit the rollback itself as a new commit (don't rewrite history) so
   the git log stays an honest record of what was actually deployed and
   when.

This only protects the scenario logic (flow, prompts, routing). It does
not cover data store contents (facts/tasks/reminders people have already
saved) or data store *schema* — those aren't part of a blueprint export
and have no automatic versioning; be careful with destructive data store
changes separately.

Going forward, every live edit should re-export the changed blueprint(s)
into `make/` and commit them in the same session as the change (per
[Editing the live system](#editing-the-live-system) above) — that's what
keeps this rollback path actually up to date rather than stale.
