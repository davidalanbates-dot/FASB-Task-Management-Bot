import { Router } from "express";
import { readDb, writeDb, makeId } from "../db.js";

const router = Router();

const VALID_STATUSES = ["todo", "in-progress", "blocked", "done"];
const VALID_PRIORITIES = ["low", "medium", "high"];

router.get("/", async (req, res) => {
  const db = await readDb();
  let tasks = db.tasks;
  if (req.query.asuId) tasks = tasks.filter((t) => t.asuId === req.query.asuId);
  if (req.query.status) tasks = tasks.filter((t) => t.status === req.query.status);
  res.json(tasks);
});

router.post("/", async (req, res) => {
  const { asuId, title, description, status, priority, assignee, dueDate } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(", ")}` });
  }
  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `priority must be one of ${VALID_PRIORITIES.join(", ")}` });
  }
  const db = await readDb();
  if (asuId && !db.asus.some((a) => a.id === asuId)) {
    return res.status(400).json({ error: "asuId does not reference an existing ASU" });
  }
  const now = new Date().toISOString();
  const task = {
    id: makeId("task"),
    asuId: asuId || null,
    title,
    description: description || "",
    status: status || "todo",
    priority: priority || "medium",
    assignee: assignee || "",
    dueDate: dueDate || null,
    createdAt: now,
    updatedAt: now,
  };
  db.tasks.push(task);
  await writeDb(db);
  res.status(201).json(task);
});

router.put("/:id", async (req, res) => {
  const { status, priority } = req.body;
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(", ")}` });
  }
  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `priority must be one of ${VALID_PRIORITIES.join(", ")}` });
  }
  const db = await readDb();
  const idx = db.tasks.findIndex((t) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Task not found" });
  db.tasks[idx] = {
    ...db.tasks[idx],
    ...req.body,
    id: db.tasks[idx].id,
    updatedAt: new Date().toISOString(),
  };
  await writeDb(db);
  res.json(db.tasks[idx]);
});

router.delete("/:id", async (req, res) => {
  const db = await readDb();
  const idx = db.tasks.findIndex((t) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Task not found" });
  const [removed] = db.tasks.splice(idx, 1);
  await writeDb(db);
  res.json(removed);
});

export default router;
