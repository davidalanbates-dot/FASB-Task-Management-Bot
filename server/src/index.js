import express from "express";
import cors from "cors";
import asusRouter from "./routes/asus.js";
import tasksRouter from "./routes/tasks.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api/asus", asusRouter);
app.use("/api/tasks", tasksRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`FASB Task Management Bot API listening on port ${PORT}`);
});
