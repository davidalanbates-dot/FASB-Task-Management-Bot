import { useEffect, useState, useCallback } from "react";
import Timeline from "./components/Timeline";
import TaskBoard from "./components/TaskBoard";
import TaskModal from "./components/TaskModal";
import AsuModal from "./components/AsuModal";
import { api } from "./lib/api";

export default function App() {
  const [view, setView] = useState("timeline");
  const [asus, setAsus] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [taskModal, setTaskModal] = useState(null); // { task, defaultAsuId } | null
  const [asuModal, setAsuModal] = useState(null); // { asu } | null

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [asuData, taskData] = await Promise.all([api.listAsus(), api.listTasks()]);
      setAsus(asuData);
      setTasks(taskData);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function saveTask(body) {
    try {
      if (taskModal.task) {
        await api.updateTask(taskModal.task.id, body);
      } else {
        await api.createTask(body);
      }
      setTaskModal(null);
      await loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteTask(id) {
    try {
      await api.deleteTask(id);
      setTaskModal(null);
      await loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function moveTask(id, status) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    try {
      await api.updateTask(id, { status });
    } catch (e) {
      setError(e.message);
      await loadAll();
    }
  }

  async function saveAsu(body) {
    try {
      if (asuModal.asu) {
        await api.updateAsu(asuModal.asu.id, body);
      } else {
        await api.createAsu(body);
      }
      setAsuModal(null);
      await loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteAsu(id) {
    try {
      await api.deleteAsu(id);
      setAsuModal(null);
      await loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">FASB</span>
          <span className="brand-name">Task Management Bot</span>
        </div>
        <nav className="tabs">
          <button className={view === "timeline" ? "active" : ""} onClick={() => setView("timeline")}>
            Timeline
          </button>
          <button className={view === "tasks" ? "active" : ""} onClick={() => setView("tasks")}>
            Tasks
          </button>
        </nav>
      </header>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <main className="app-main">
        {loading ? (
          <p className="empty-state">Loading…</p>
        ) : view === "timeline" ? (
          <Timeline
            asus={asus}
            tasks={tasks}
            onEditAsu={(asu) => setAsuModal({ asu })}
            onNewAsu={() => setAsuModal({ asu: null })}
            onNewTask={(asuId) => setTaskModal({ task: null, defaultAsuId: asuId })}
            onEditTask={(task) => setTaskModal({ task, defaultAsuId: null })}
          />
        ) : (
          <TaskBoard
            tasks={tasks}
            asus={asus}
            onNewTask={(asuId) => setTaskModal({ task: null, defaultAsuId: asuId })}
            onEditTask={(task) => setTaskModal({ task, defaultAsuId: null })}
            onMoveTask={moveTask}
          />
        )}
      </main>

      {taskModal && (
        <TaskModal
          asus={asus}
          task={taskModal.task}
          defaultAsuId={taskModal.defaultAsuId}
          onClose={() => setTaskModal(null)}
          onSave={saveTask}
          onDelete={deleteTask}
        />
      )}

      {asuModal && (
        <AsuModal
          asu={asuModal.asu}
          onClose={() => setAsuModal(null)}
          onSave={saveAsu}
          onDelete={deleteAsu}
        />
      )}
    </div>
  );
}
