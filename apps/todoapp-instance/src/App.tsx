import { useEffect, useState } from "react";

type Todo = { id: number; title: string; done: number; created_at: string };

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    const r = await fetch("/api/todos");
    if (!r.ok) return setErr(await r.text());
    setTodos(await r.json());
  }

  useEffect(() => {
    void load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!r.ok) return setErr(await r.text());
    setTitle("");
    await load();
  }

  async function toggle(t: Todo) {
    await fetch(`/api/todos/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !t.done }),
    });
    await load();
  }

  async function remove(id: number) {
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div style={{ fontFamily: "system-ui", maxWidth: 520, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Todos</h1>
      <p style={{ color: "#666" }}>
        API proxied from Vite — run <code>npm run dev</code> in sibling <code>*-api</code>.
      </p>
      {err && <pre style={{ color: "crimson" }}>{err}</pre>}
      <form onSubmit={add}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New task"
          style={{ width: "70%", padding: "0.5rem" }}
        />
        <button type="submit" style={{ marginLeft: 8 }}>
          Add
        </button>
      </form>
      <ul style={{ marginTop: "1.5rem", lineHeight: 1.8 }}>
        {todos.map((t) => (
          <li key={t.id}>
            <label>
              <input type="checkbox" checked={!!t.done} onChange={() => void toggle(t)} /> {t.title}
            </label>
            <button type="button" onClick={() => void remove(t.id)} style={{ marginLeft: 12 }}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
