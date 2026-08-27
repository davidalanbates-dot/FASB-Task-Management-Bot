import { useEffect, useState } from "react";

const STATUSES = [
  { value: "todo", label: "To Do" },
  { value: "in-progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
];
const PRIORITIES = ["low", "medium", "high"];

const EMPTY = {
  title: "",
  description: "",
  asuId: "",
  status: "todo",
  priority: "medium",
  assignee: "",
  dueDate: "",
};

export default function TaskModal({ asus, task, defaultAsuId, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || "",
        description: task.description || "",
        asuId: task.asuId || "",
        status: task.status || "todo",
        priority: task.priority || "medium",
        assignee: task.assignee || "",
        dueDate: task.dueDate || "",
      });
    } else {
      setForm({ ...EMPTY, asuId: defaultAsuId || "" });
    }
  }, [task, defaultAsuId]);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave({
      ...form,
      asuId: form.asuId || null,
      dueDate: form.dueDate || null,
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{task ? "Edit Task" : "New Task"}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Title
            <input
              autoFocus
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              required
            />
          </label>

          <label>
            Description
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </label>

          <label>
            Linked ASU
            <select value={form.asuId} onChange={(e) => update("asuId", e.target.value)}>
              <option value="">— None —</option>
              {asus.map((a) => (
                <option key={a.id} value={a.id}>
                  ASU {a.number} — {a.title}
                </option>
              ))}
            </select>
          </label>

          <div className="form-row">
            <label>
              Status
              <select value={form.status} onChange={(e) => update("status", e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Priority
              <select value={form.priority} onChange={(e) => update("priority", e.target.value)}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p[0].toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-row">
            <label>
              Assignee
              <input value={form.assignee} onChange={(e) => update("assignee", e.target.value)} />
            </label>

            <label>
              Due date
              <input
                type="date"
                value={form.dueDate || ""}
                onChange={(e) => update("dueDate", e.target.value)}
              />
            </label>
          </div>

          <div className="modal-actions">
            {task && (
              <button
                type="button"
                className="btn-danger"
                onClick={() => onDelete(task.id)}
              >
                Delete
              </button>
            )}
            <div className="spacer" />
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
