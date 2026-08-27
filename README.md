# FASB Task Management Bot

A timeline and task management app for tracking FASB Accounting Standards
Updates (ASUs) and the internal implementation work they require.

- **Timeline** — a chronological view of ASUs by effective date, showing
  which standards are already effective vs. upcoming, with a task-completion
  progress bar and expandable details (summary, tags, link to FASB.org,
  linked implementation tasks) for each one.
- **Task Board** — a kanban board (To Do / In Progress / Blocked / Done)
  for implementation tasks, optionally linked to a specific ASU, with
  drag-and-drop between columns, priority, assignee, and due date.

## Stack

- **Backend**: Node.js + Express, `server/`. Data is persisted to a JSON
  file (`server/src/data/db.json`) — no external database required.
- **Frontend**: React + Vite, `client/`.

## Getting started

```bash
npm run install:all   # installs server + client dependencies
npm run dev            # runs the API (port 4000) and the Vite dev server (port 5173)
```

Then open http://localhost:5173. The Vite dev server proxies `/api/*`
requests to the backend on port 4000 (see `client/vite.config.js`).

To run each side individually:

```bash
npm run dev:server   # API only, http://localhost:4000
npm run dev:client   # frontend only, http://localhost:5173
```

For production, build the frontend with `npm run build` (outputs to
`client/dist/`) and serve it with any static file server, alongside the
API running via `npm start --prefix server`.

## API

| Method | Path             | Description                          |
|--------|------------------|---------------------------------------|
| GET    | `/api/asus`      | List all ASUs                         |
| POST   | `/api/asus`      | Create an ASU                         |
| GET    | `/api/asus/:id`  | Get one ASU                           |
| PUT    | `/api/asus/:id`  | Update an ASU                         |
| DELETE | `/api/asus/:id`  | Delete an ASU (and its linked tasks)  |
| GET    | `/api/tasks`     | List tasks (`?asuId=`, `?status=`)    |
| POST   | `/api/tasks`     | Create a task                         |
| PUT    | `/api/tasks/:id` | Update a task                         |
| DELETE | `/api/tasks/:id` | Delete a task                         |

Task `status` is one of `todo`, `in-progress`, `blocked`, `done`.
Task `priority` is one of `low`, `medium`, `high`.

## Seed data

`server/src/data/db.json` ships with a starter set of well-known FASB
ASUs (revenue recognition, leases, CECL, segment reporting, income tax
disclosures, etc.) and a couple of example tasks. Effective dates are
illustrative starting points — verify current effective dates against
[fasb.org](https://fasb.org) before relying on them, and add/edit ASUs
from the UI as needed.
