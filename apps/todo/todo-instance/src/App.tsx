import { useEffect, useState } from "react";

type Todo = { id: number; title: string; done: 0 | 1 | boolean; created_at: string };

const API = import.meta.env.VITE_API_TARGET ?? "http://localhost:4000";

export function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");

  async function refresh() {
    const r = await fetch(`${API}/api/todos`);
    setTodos(await r.json());
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function addTodo() {
    const t = title.trim();
    if (!t) return;
    await fetch(`${API}/api/todos`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: t }) });
    setTitle("");
    await refresh();
  }

  return (
    <div style={{ fontFamily: "system-ui", maxWidth: 720, margin: "24px auto", padding: 16 }}>
      <h1>todo</h1>
      <p style={{ opacity: 0.7 }}>Generated scaffold (v1)</p>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New todo" style={{ flex: 1, padding: 8 }} />
        <button onClick={() => void addTodo()}>Add</button>
      </div>
      <ul>
        {todos.map((t) => (
          <li key={t.id}>
            {String(t.done) === "1" ? "✅" : "⬜"} {t.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
