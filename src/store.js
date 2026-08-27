import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "data", "db.json");

let writeQueue = Promise.resolve();

async function readDb() {
  const raw = await readFile(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

function writeDb(data) {
  writeQueue = writeQueue.then(() => writeFile(DB_PATH, JSON.stringify(data, null, 2), "utf-8"));
  return writeQueue;
}

function makeTaskId(existingIds) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id;
  do {
    id = "t" + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  } while (existingIds.includes(id));
  return id;
}

export const VALID_STATUSES = ["todo", "in-progress", "blocked", "done"];
export const VALID_PRIORITIES = ["low", "medium", "high"];

export async function upsertUser({ id, username, firstName, chatId }) {
  const db = await readDb();
  const idx = db.users.findIndex((u) => u.id === id);
  const now = new Date().toISOString();
  if (idx === -1) {
    db.users.push({ id, username: username || null, firstName: firstName || "", chatId, joinedAt: now });
  } else {
    db.users[idx] = { ...db.users[idx], username: username || null, firstName: firstName || "", chatId };
  }
  await writeDb(db);
  return db.users.find((u) => u.id === id);
}

export async function listUsers() {
  const db = await readDb();
  return db.users;
}

export async function findUserById(id) {
  const db = await readDb();
  return db.users.find((u) => u.id === id) || null;
}

export async function findUserByUsername(username) {
  const clean = username.replace(/^@/, "").toLowerCase();
  const db = await readDb();
  return db.users.find((u) => (u.username || "").toLowerCase() === clean) || null;
}

export async function listAsus() {
  const db = await readDb();
  return db.asus;
}

export async function findAsuByNumber(number) {
  const db = await readDb();
  return db.asus.find((a) => a.number === number) || null;
}

export async function addAsu(asu) {
  const db = await readDb();
  if (db.asus.some((a) => a.number === asu.number)) {
    throw new Error(`ASU ${asu.number} already exists`);
  }
  const record = {
    id: `asu-${asu.number}`,
    number: asu.number,
    title: asu.title,
    topic: asu.topic || "",
    summary: asu.summary || "",
    publicEffectiveDate: asu.publicEffectiveDate,
    otherEffectiveDate: asu.otherEffectiveDate || asu.publicEffectiveDate,
    url: asu.url || "",
    tags: asu.tags || [],
  };
  db.asus.push(record);
  await writeDb(db);
  return record;
}

export async function listTasks({ status, asuNumber, assigneeId } = {}) {
  const db = await readDb();
  let tasks = db.tasks;
  if (status) tasks = tasks.filter((t) => t.status === status);
  if (assigneeId) tasks = tasks.filter((t) => t.assigneeId === assigneeId);
  if (asuNumber) {
    const asu = db.asus.find((a) => a.number === asuNumber);
    tasks = asu ? tasks.filter((t) => t.asuId === asu.id) : [];
  }
  return tasks;
}

export async function findTask(id) {
  const db = await readDb();
  return db.tasks.find((t) => t.id === id) || null;
}

export async function addTask({ asuId, title, description, priority, assigneeId, dueDate, createdById }) {
  const db = await readDb();
  const now = new Date().toISOString();
  const task = {
    id: makeTaskId(db.tasks.map((t) => t.id)),
    asuId: asuId || null,
    title,
    description: description || "",
    status: "todo",
    priority: priority || "medium",
    assigneeId: assigneeId || null,
    createdById: createdById || null,
    dueDate: dueDate || null,
    createdAt: now,
    updatedAt: now,
  };
  db.tasks.push(task);
  await writeDb(db);
  return task;
}

export async function updateTask(id, patch) {
  const db = await readDb();
  const idx = db.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  db.tasks[idx] = { ...db.tasks[idx], ...patch, id: db.tasks[idx].id, updatedAt: new Date().toISOString() };
  await writeDb(db);
  return db.tasks[idx];
}

export async function getAsuById(id) {
  const db = await readDb();
  return db.asus.find((a) => a.id === id) || null;
}

// Read-only snapshot of the whole store, for commands that need to
// cross-reference tasks with their ASUs and assignees in one pass.
export async function getSnapshot() {
  return readDb();
}
