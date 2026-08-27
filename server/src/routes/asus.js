import { Router } from "express";
import { readDb, writeDb, makeId } from "../db.js";

const router = Router();

router.get("/", async (_req, res) => {
  const db = await readDb();
  res.json(db.asus);
});

router.get("/:id", async (req, res) => {
  const db = await readDb();
  const asu = db.asus.find((a) => a.id === req.params.id);
  if (!asu) return res.status(404).json({ error: "ASU not found" });
  res.json(asu);
});

router.post("/", async (req, res) => {
  const { number, title, topic, summary, publicEffectiveDate, otherEffectiveDate, url, tags } = req.body;
  if (!number || !title || !publicEffectiveDate) {
    return res.status(400).json({ error: "number, title, and publicEffectiveDate are required" });
  }
  const db = await readDb();
  const asu = {
    id: makeId("asu"),
    number,
    title,
    topic: topic || "",
    summary: summary || "",
    publicEffectiveDate,
    otherEffectiveDate: otherEffectiveDate || publicEffectiveDate,
    url: url || "",
    tags: Array.isArray(tags) ? tags : [],
  };
  db.asus.push(asu);
  await writeDb(db);
  res.status(201).json(asu);
});

router.put("/:id", async (req, res) => {
  const db = await readDb();
  const idx = db.asus.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "ASU not found" });
  db.asus[idx] = { ...db.asus[idx], ...req.body, id: db.asus[idx].id };
  await writeDb(db);
  res.json(db.asus[idx]);
});

router.delete("/:id", async (req, res) => {
  const db = await readDb();
  const idx = db.asus.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "ASU not found" });
  const [removed] = db.asus.splice(idx, 1);
  db.tasks = db.tasks.filter((t) => t.asuId !== req.params.id);
  await writeDb(db);
  res.json(removed);
});

export default router;
