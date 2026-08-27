import { formatDate } from "../lib/dates";

const COLUMNS = [
  { status: "todo", label: "To Do" },
  { status: "in-progress", label: "In Progress" },
  { status: "blocked", label: "Blocked" },
  { status: "done", label: "Done" },
];

export default function TaskBoard({ tasks, asus, onNewTask, onEditTask, onMoveTask }) {
  const asuById = Object.fromEntries(asus.map((a) => [a.id, a]));

  function handleDrop(e, status) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/task-id");
    if (taskId) onMoveTask(taskId, status);
  }

  return (
    <div className="task-board">
      <div className="timeline-header">
        <h2>Task Board</h2>
        <button className="btn-primary" onClick={() => onNewTask(null)}>
          + New Task
        </button>
      </div>

      <div className="board-columns">
        {COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t) => t.status === col.status);
          return (
            <div
              key={col.status}
              className="board-column"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, col.status)}
            >
              <div className="board-column-head">
                <h3>{col.label}</h3>
                <span className="column-count">{columnTasks.length}</span>
              </div>
              <div className="board-column-body">
                {columnTasks.map((t) => {
                  const asu = t.asuId ? asuById[t.asuId] : null;
                  return (
                    <div
                      key={t.id}
                      className="task-card"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/task-id", t.id)}
                      onClick={() => onEditTask(t)}
                    >
                      <div className={`priority-strip priority-${t.priority}`} />
                      <div className="task-card-body">
                        <p className="task-card-title">{t.title}</p>
                        {asu && <span className="task-card-asu">ASU {asu.number}</span>}
                        <div className="task-card-meta">
                          {t.assignee && <span>{t.assignee}</span>}
                          {t.dueDate && <span>Due {formatDate(t.dueDate)}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {columnTasks.length === 0 && <p className="empty-state small">No tasks</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
