import { useEffect, useMemo, useRef, useState } from "react";
import { loadTodos, saveTodos, type Todo } from "./todos.storage";
import { BulkActions } from "./components/BulkActions";
import { Filters } from "./components/Filters";
import {
  clearCompletedTodos,
  getCounts,
  getVisibleTodos,
  toggleAllTodos,
  type Filter,
} from "./todos.model";
import { TodoList } from "./components/TodoList";

function newId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function App() {
  const [title, setTitle] = useState("");
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [lastDeleted, setLastDeleted] = useState<{ todo: Todo; index: number } | null>(null);
  const [todos, setTodos] = useState<Todo[]>(() => {
    return loadTodos();
  });

  useEffect(() => {
    saveTodos(todos);
  }, [todos]);

  const { remaining, total } = useMemo(() => getCounts(todos), [todos]);
  const visibleTodos = useMemo(() => getVisibleTodos(todos, filter), [todos, filter]);

  function add(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setLastDeleted(null);
    setTodos((prev) => [{ id: newId(), title: trimmed, done: false, createdAt: Date.now() }, ...prev]);
    setTitle("");
    titleInputRef.current?.focus();
  }

  function toggle(id: string) {
    setLastDeleted(null);
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function remove(id: string) {
    setLastDeleted(null);
    setTodos((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx === -1) return prev;
      setLastDeleted({ todo: prev[idx]!, index: idx });
      return prev.filter((t) => t.id !== id);
    });
  }

  function updateTitle(id: string, nextTitle: string) {
    setLastDeleted(null);
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, title: nextTitle } : t)));
  }

  function clearCompleted() {
    setLastDeleted(null);
    setTodos((prev) => clearCompletedTodos(prev));
  }

  function toggleAll() {
    setLastDeleted(null);
    setTodos((prev) => toggleAllTodos(prev));
  }

  function undoDelete() {
    if (!lastDeleted) return;
    setTodos((prev) => {
      if (prev.some((t) => t.id === lastDeleted.todo.id)) return prev;
      const idx = Math.max(0, Math.min(lastDeleted.index, prev.length));
      const next = [...prev];
      next.splice(idx, 0, lastDeleted.todo);
      return next;
    });
    setLastDeleted(null);
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
        <Filters value={filter} onChange={setFilter} />
        <BulkActions onToggleAll={toggleAll} onClearCompleted={clearCompleted} />
      </div>

      {lastDeleted ? (
        <div role="status" style={{ marginTop: "0.75rem", color: "#666", display: "flex", gap: 8 }}>
          <span>Todo deleted.</span>
          <button type="button" onClick={undoDelete} aria-label="Undo delete">
            Undo
          </button>
        </div>
      ) : null}

      {total === 0 ? (
        <div role="status" style={{ marginTop: "1rem", color: "#666" }}>
          No todos yet. Add one above to get started.
        </div>
      ) : null}

      <TodoList todos={visibleTodos} onToggle={toggle} onDelete={remove} onUpdateTitle={updateTitle} />
    </div>
  );
}

