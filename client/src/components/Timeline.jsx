import { useMemo, useState } from "react";
import { formatDate, isPast, daysUntil } from "../lib/dates";

function taskProgress(tasks) {
  if (tasks.length === 0) return null;
  const done = tasks.filter((t) => t.status === "done").length;
  return { done, total: tasks.length, pct: Math.round((done / tasks.length) * 100) };
}

export default function Timeline({ asus, tasks, onEditAsu, onNewAsu, onNewTask, onEditTask }) {
  const [expanded, setExpanded] = useState(() => new Set());

  const sorted = useMemo(
    () => [...asus].sort((a, b) => a.publicEffectiveDate.localeCompare(b.publicEffectiveDate)),
    [asus]
  );

  function toggle(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="timeline">
      <div className="timeline-header">
        <h2>FASB Standards Timeline</h2>
        <button className="btn-primary" onClick={onNewAsu}>
          + Add ASU
        </button>
      </div>

      {sorted.length === 0 && <p className="empty-state">No ASUs yet. Add one to get started.</p>}

      <ol className="timeline-list">
        {sorted.map((asu) => {
          const asuTasks = tasks.filter((t) => t.asuId === asu.id);
          const progress = taskProgress(asuTasks);
          const past = isPast(asu.publicEffectiveDate);
          const dtu = daysUntil(asu.publicEffectiveDate);
          const isOpen = expanded.has(asu.id);

          return (
            <li key={asu.id} className={`timeline-item ${past ? "is-past" : "is-upcoming"}`}>
              <div className="timeline-dot" />
              <div className="timeline-card">
                <div className="timeline-card-head" onClick={() => toggle(asu.id)}>
                  <div>
                    <span className="asu-number">ASU {asu.number}</span>
                    {asu.topic && <span className="asu-topic">{asu.topic}</span>}
                    <h3>{asu.title}</h3>
                  </div>
                  <div className="timeline-status">
                    {past ? (
                      <span className="badge badge-effective">Effective</span>
                    ) : (
                      <span className="badge badge-upcoming">
                        {dtu != null && dtu >= 0 ? `${dtu} days out` : "Upcoming"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="timeline-dates">
                  <span>Public entities: {formatDate(asu.publicEffectiveDate)}</span>
                  {asu.otherEffectiveDate && asu.otherEffectiveDate !== asu.publicEffectiveDate && (
                    <span>Other entities: {formatDate(asu.otherEffectiveDate)}</span>
                  )}
                </div>

                {progress && (
                  <div className="progress-row">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${progress.pct}%` }} />
                    </div>
                    <span className="progress-label">
                      {progress.done}/{progress.total} tasks done
                    </span>
                  </div>
                )}

                {isOpen && (
                  <div className="timeline-details">
                    {asu.summary && <p className="asu-summary">{asu.summary}</p>}
                    {asu.tags?.length > 0 && (
                      <div className="tag-row">
                        {asu.tags.map((t) => (
                          <span key={t} className="tag">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    {asu.url && (
                      <a className="asu-link" href={asu.url} target="_blank" rel="noreferrer">
                        View on FASB.org ↗
                      </a>
                    )}

                    <div className="linked-tasks">
                      <div className="linked-tasks-head">
                        <strong>Implementation tasks</strong>
                        <button className="btn-ghost btn-small" onClick={() => onNewTask(asu.id)}>
                          + Add task
                        </button>
                      </div>
                      {asuTasks.length === 0 ? (
                        <p className="empty-state small">No tasks linked yet.</p>
                      ) : (
                        <ul className="mini-task-list">
                          {asuTasks.map((t) => (
                            <li key={t.id} onClick={() => onEditTask(t)}>
                              <span className={`status-dot status-${t.status}`} />
                              <span className="mini-task-title">{t.title}</span>
                              {t.dueDate && <span className="mini-task-due">{formatDate(t.dueDate)}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <button className="btn-ghost btn-small" onClick={() => onEditAsu(asu)}>
                      Edit ASU
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
