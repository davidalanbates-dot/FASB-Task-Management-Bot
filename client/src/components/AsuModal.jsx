import { useEffect, useState } from "react";

const EMPTY = {
  number: "",
  title: "",
  topic: "",
  summary: "",
  publicEffectiveDate: "",
  otherEffectiveDate: "",
  url: "",
  tags: "",
};

export default function AsuModal({ asu, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (asu) {
      setForm({
        number: asu.number || "",
        title: asu.title || "",
        topic: asu.topic || "",
        summary: asu.summary || "",
        publicEffectiveDate: asu.publicEffectiveDate || "",
        otherEffectiveDate: asu.otherEffectiveDate || "",
        url: asu.url || "",
        tags: (asu.tags || []).join(", "),
      });
    } else {
      setForm(EMPTY);
    }
  }, [asu]);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.number.trim() || !form.title.trim() || !form.publicEffectiveDate) return;
    onSave({
      ...form,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{asu ? "Edit ASU" : "New ASU"}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label>
              ASU Number
              <input
                autoFocus
                placeholder="2025-01"
                value={form.number}
                onChange={(e) => update("number", e.target.value)}
                required
              />
            </label>
            <label>
              Topic
              <input
                placeholder="Topic 606"
                value={form.topic}
                onChange={(e) => update("topic", e.target.value)}
              />
            </label>
          </div>

          <label>
            Title
            <input value={form.title} onChange={(e) => update("title", e.target.value)} required />
          </label>

          <label>
            Summary
            <textarea rows={3} value={form.summary} onChange={(e) => update("summary", e.target.value)} />
          </label>

          <div className="form-row">
            <label>
              Public entity effective date
              <input
                type="date"
                value={form.publicEffectiveDate}
                onChange={(e) => update("publicEffectiveDate", e.target.value)}
                required
              />
            </label>
            <label>
              Other entities effective date
              <input
                type="date"
                value={form.otherEffectiveDate}
                onChange={(e) => update("otherEffectiveDate", e.target.value)}
              />
            </label>
          </div>

          <label>
            FASB URL
            <input value={form.url} onChange={(e) => update("url", e.target.value)} />
          </label>

          <label>
            Tags (comma separated)
            <input value={form.tags} onChange={(e) => update("tags", e.target.value)} />
          </label>

          <div className="modal-actions">
            {asu && (
              <button type="button" className="btn-danger" onClick={() => onDelete(asu.id)}>
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
