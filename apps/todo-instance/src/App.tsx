import { useEffect, useMemo, useRef, useState } from "react";
import { loadTodos, saveTodos, type Todo } from "./todos.storage";

function newId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type Filter = "all" | "active" | "completed";

export default function App() {
  const [title, setTitle] = useState("");
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [todos, setTodos] = useState<Todo[]>(() => {
    const existing = loadTodos();
    if (existing.length > 0) return existing;

    return [
      { id: newId(), title: "Scaffolded todo-instance", done: true, createdAt: Date.now() },
      { id: newId(), title: "Persistence: refresh should keep todos", done: false, createdAt: Date.now() },
    ];
  });

  useEffect(() => {
    saveTodos(todos);
  }, [todos]);

  const remaining = useMemo(() => todos.filter((t) => !t.done).length, [todos]);
  const total = todos.length;
  const visibleTodos = useMemo(() => {
    if (filter === "active") return todos.filter((t) => !t.done);
    if (filter === "completed") return todos.filter((t) => t.done);
    return todos;
  }, [filter, todos]);

  function add(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setTodos((prev) => [{ id: newId(), title: trimmed, done: false, createdAt: Date.now() }, ...prev]);
    setTitle("");
    titleInputRef.current?.focus();
  }

  function toggle(id: string) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function remove(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  function clearCompleted() {
    setTodos((prev) => prev.filter((t) => !t.done));
  }

  function toggleAll() {
    setTodos((prev) => {
      const hasActive = prev.some((t) => !t.done);
      const nextDone = hasActive;
      return prev.map((t) => ({ ...t, done: nextDone }));
    });
  }

  return (
    <div style={{ fontFamily: "system-ui", maxWidth: 560, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Todo (placeholder)</h1>
      <p style={{ color: "#666" }}>
        This is a scaffold-only shell. Next steps: write a spec, generate tasks, then implement persistence/API.
      </p>

      <form onSubmit={add} style={{ display: "flex", gap: 8 }}>
        <input
          ref={titleInputRef}
          id="new-todo-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task"
          aria-label="New todo title"
          style={{ flex: 1, padding: "0.6rem" }}
        />
        <button type="submit" disabled={!title.trim()}>
          Add
        </button>
      </form>

      <div style={{ marginTop: "1rem", color: "#666" }} aria-live="polite">
        {remaining} remaining ({total} total)
      </div>

      <div style={{ marginTop: "0.75rem", display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div role="group" aria-label="Filter todos" style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setFilter("all")} aria-pressed={filter === "all"}>
            All
          </button>
          <button type="button" onClick={() => setFilter("active")} aria-pressed={filter === "active"}>
            Active
          </button>
          <button type="button" onClick={() => setFilter("completed")} aria-pressed={filter === "completed"}>
            Completed
          </button>
        </div>
        <button type="button" onClick={toggleAll} aria-label="Toggle all todos">
          Toggle all
        </button>
        <button type="button" onClick={clearCompleted} aria-label="Clear completed todos">
          Clear completed
        </button>
      </div>

      <ul style={{ marginTop: "1rem", lineHeight: 1.9, paddingLeft: 18 }}>
        {visibleTodos.map((t) => (
          <li key={t.id}>
            <label style={{ cursor: "pointer" }}>
              <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />{" "}
              <span style={{ textDecoration: t.done ? "line-through" : "none" }}>{t.title}</span>
            </label>
            <button
              type="button"
              onClick={() => remove(t.id)}
              style={{ marginLeft: 12 }}
              aria-label={`Delete todo: ${t.title}`}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

