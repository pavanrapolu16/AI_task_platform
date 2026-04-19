import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const OPERATIONS = [
  { value: "uppercase", label: "Uppercase" },
  { value: "lowercase", label: "Lowercase" },
  { value: "reverse", label: "Reverse String" },
  { value: "word_count", label: "Word Count" }
];

function App() {
  const [authMode, setAuthMode] = useState("login");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "null"));
  const [notice, setNotice] = useState("");

  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [taskForm, setTaskForm] = useState({
    title: "",
    inputText: "",
    operationType: "uppercase"
  });
  const [tasksState, setTasksState] = useState({
    tasks: [],
    page: 1,
    totalPages: 1,
    loading: false
  });

  const api = useMemo(() => {
    const client = axios.create({ baseURL: API_URL });
    if (token) {
      client.defaults.headers.common.Authorization = `Bearer ${token}`;
    }
    return client;
  }, [token]);

  const fetchTasks = useCallback(
    async (page = 1, silent = false) => {
      if (!token) return;
      if (!silent) {
        setTasksState((prev) => ({ ...prev, loading: true }));
      }
      try {
        const { data } = await api.get(`/api/tasks?page=${page}&limit=8`);
        setTasksState({
          tasks: data.tasks || [],
          page: data.page || 1,
          totalPages: data.totalPages || 1,
          loading: false
        });
      } catch (error) {
        if (!silent) {
          setNotice(error.response?.data?.message || "Failed to load tasks");
          setTasksState((prev) => ({ ...prev, loading: false }));
        }
      }
    },
    [api, token]
  );

  useEffect(() => {
    if (!token) return;
    fetchTasks(1);
    const timer = setInterval(() => fetchTasks(tasksState.page, true), 3000);
    return () => clearInterval(timer);
  }, [token, fetchTasks, tasksState.page]);

  async function submitAuth(e) {
    e.preventDefault();
    try {
      const path = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        authMode === "login"
          ? { email: authForm.email, password: authForm.password }
          : authForm;
      const { data } = await api.post(path, payload);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setNotice("Authentication successful");
      setAuthForm({ name: "", email: "", password: "" });
    } catch (error) {
      setNotice(error.response?.data?.message || "Authentication failed");
    }
  }

  async function createTask(e) {
    e.preventDefault();
    try {
      await api.post("/api/tasks", taskForm);
      setNotice("Task created and queued automatically");
      setTaskForm({ title: "", inputText: "", operationType: "uppercase" });
      fetchTasks(1);
    } catch (error) {
      setNotice(error.response?.data?.message || "Task creation failed");
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
    setNotice("Logged out");
  }

  const statusSummary = tasksState.tasks.reduce(
    (acc, task) => {
      if (task.status === "success") acc.success += 1;
      if (task.status === "failed") acc.failed += 1;
      if (task.status === "pending" || task.status === "running") acc.active += 1;
      return acc;
    },
    { success: 0, failed: 0, active: 0 }
  );

  if (!token) {
    return (
      <main className="container auth">
        <div className="auth-head">
          <p className="eyebrow">Async Text Operations</p>
          <h1>AI Task Processing Platform</h1>
          <p>{authMode === "login" ? "Sign in" : "Create your account"} to manage tasks.</p>
        </div>
        {notice && <div className="notice">{notice}</div>}
        <form onSubmit={submitAuth} className="panel">
          {authMode === "register" && (
            <label>
              Name
              <input
                required
                value={authForm.name}
                onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              required
              value={authForm.email}
              onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
            />
          </label>
          <button type="submit">{authMode === "login" ? "Login" : "Register"}</button>
        </form>
        <button
          className="ghost"
          onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
        >
          {authMode === "login" ? "Need an account? Register" : "Already have an account? Login"}
        </button>
      </main>
    );
  }

  return (
    <main className="container">
      <header className="header hero">
        <div>
          <p className="eyebrow">Task Console</p>
          <h1>AI Task Processing Platform</h1>
          <p>Welcome, {user?.name || user?.email}</p>
        </div>
        <div className="hero-right">
          <div className="stat-grid">
            <div className="stat">
              <span>Success</span>
              <strong>{statusSummary.success}</strong>
            </div>
            <div className="stat">
              <span>Failed</span>
              <strong>{statusSummary.failed}</strong>
            </div>
            <div className="stat">
              <span>Active</span>
              <strong>{statusSummary.active}</strong>
            </div>
          </div>
          <button className="ghost" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {notice && <div className="notice">{notice}</div>}

      <section className="panel">
        <h2>Create Task</h2>
        <form onSubmit={createTask} className="grid">
          <label>
            Title
            <input
              required
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
            />
          </label>
          <label>
            Operation
            <select
              value={taskForm.operationType}
              onChange={(e) => setTaskForm({ ...taskForm, operationType: e.target.value })}
            >
              {OPERATIONS.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </label>
          <label className="full">
            Input Text
            <textarea
              required
              rows={4}
              value={taskForm.inputText}
              onChange={(e) => setTaskForm({ ...taskForm, inputText: e.target.value })}
            />
          </label>
          <button type="submit">Create</button>
        </form>
      </section>

      <section className="panel">
        <div className="row">
          <h2>Tasks</h2>
          <button onClick={() => fetchTasks(tasksState.page)} disabled={tasksState.loading}>
            Refresh
          </button>
        </div>
        <div className="list">
          {tasksState.tasks.length === 0 && <p>No tasks yet.</p>}
          {tasksState.tasks.map((task) => (
            <article key={task._id} className="task">
              <div className="row">
                <h3>{task.title}</h3>
                <span className={`status ${task.status}`}>{task.status}</span>
              </div>
              <div className="task-meta">
                <p>
                  <strong>Operation:</strong> {task.operationType}
                </p>
                <p>
                  <strong>Result:</strong>{" "}
                  {task.result === null || task.result === undefined ? "-" : String(task.result)}
                </p>
              </div>
              <p className="muted-text">
                <strong>Input:</strong> {task.inputText}
              </p>
              <p className="muted-text">
                <strong>Error:</strong> {task.errorMessage || "-"}
              </p>
              <div className="logs">
                <strong>Logs:</strong>
                {(task.logs || []).slice(-4).map((log, idx) => (
                  <div key={idx}>
                    {new Date(log.createdAt).toLocaleString()} - {log.message}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="row">
          <button
            disabled={tasksState.page <= 1}
            onClick={() => fetchTasks(tasksState.page - 1)}
          >
            Prev
          </button>
          <span>
            Page {tasksState.page} of {tasksState.totalPages}
          </span>
          <button
            disabled={tasksState.page >= tasksState.totalPages}
            onClick={() => fetchTasks(tasksState.page + 1)}
          >
            Next
          </button>
        </div>
      </section>
    </main>
  );
}

export default App;
