import { useEffect, useMemo, useState } from "react";
import { loadTodos, saveTodos, type Todo } from "./todos.storage";

function newId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function App() {
  const [title, setTitle] = useState("");
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

  function add(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setTodos((prev) => [{ id: newId(), title: trimmed, done: false, createdAt: Date.now() }, ...prev]);
    setTitle("");
  }

  function toggle(id: string) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function remove(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div style={{ fontFamily: "system-ui", maxWidth: 560, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Todo (placeholder)</h1>
      <p style={{ color: "#666" }}>
        This is a scaffold-only shell. Next steps: write a spec, generate tasks, then implement persistence/API.
      </p>

      <form onSubmit={add} style={{ display: "flex", gap: 8 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task"
          style={{ flex: 1, padding: "0.6rem" }}
        />
        <button type="submit">Add</button>
      </form>

      <div style={{ marginTop: "1rem", color: "#666" }}>{remaining} remaining</div>

      <ul style={{ marginTop: "1rem", lineHeight: 1.9, paddingLeft: 18 }}>
        {todos.map((t) => (
          <li key={t.id}>
            <label style={{ cursor: "pointer" }}>
              <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />{" "}
              <span style={{ textDecoration: t.done ? "line-through" : "none" }}>{t.title}</span>
            </label>
            <button type="button" onClick={() => remove(t.id)} style={{ marginLeft: 12 }}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

