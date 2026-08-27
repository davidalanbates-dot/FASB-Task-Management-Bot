import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "data", "db.json");

let writeQueue = Promise.resolve();

export async function readDb() {
  const raw = await readFile(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

export function writeDb(data) {
  writeQueue = writeQueue.then(() =>
    writeFile(DB_PATH, JSON.stringify(data, null, 2), "utf-8")
  );
  return writeQueue;
}

export function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
