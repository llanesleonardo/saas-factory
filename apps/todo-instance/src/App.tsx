import { useEffect, useMemo, useRef, useState } from "react";
import { loadTodos, saveTodos, type Todo } from "./todos.storage";
import { buildExportPayload, parseImportedTodos } from "./todos.portable";
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

  function exportTodos() {
    const payload = buildExportPayload(todos);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "todos.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importTodos() {
    const raw = window.prompt("Paste exported todos JSON");
    if (raw === null) return;
    try {
      const imported = parseImportedTodos(raw);
      setLastDeleted(null);
      setTodos(imported.todos);
    } catch {
      // Invalid JSON: no-op (must not crash)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Todos</h1>
        <p className="text-sm text-ink-muted">Local-only todos with export/import, filters, and bulk actions.</p>
      </header>

      <main>
        <section aria-label="Add a todo" className="rounded-xl border border-ink/10 bg-surface p-4 shadow-sm">
          <form onSubmit={add} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              ref={titleInputRef}
              id="new-todo-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a task"
              aria-label="New todo title"
              className="w-full flex-1 rounded-md border border-ink/10 bg-surface-muted px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            <button
              type="submit"
              disabled={!title.trim()}
              className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm outline-none hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-accent"
            >
              Add
            </button>
          </form>

          <div className="mt-3 text-sm text-ink-muted" aria-live="polite">
            {remaining} remaining ({total} total)
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Filters value={filter} onChange={setFilter} />
            <BulkActions onToggleAll={toggleAll} onClearCompleted={clearCompleted} />
            <div role="group" aria-label="Import and export" className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportTodos}
                className="rounded-md border border-ink/10 bg-surface px-3 py-2 text-sm font-medium text-ink shadow-sm outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-accent"
              >
                Export
              </button>
              <button
                type="button"
                onClick={importTodos}
                className="rounded-md border border-ink/10 bg-surface px-3 py-2 text-sm font-medium text-ink shadow-sm outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-accent"
              >
                Import
              </button>
            </div>
          </div>
        </section>

        {lastDeleted ? (
          <div
            role="status"
            className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-ink/10 bg-surface px-3 py-2 text-sm text-ink-muted shadow-sm"
          >
            <span>Todo deleted.</span>
            <button
              type="button"
              onClick={undoDelete}
              aria-label="Undo delete"
              className="rounded-md bg-accent/10 px-3 py-1.5 text-sm font-semibold text-accent outline-none hover:bg-accent/15 focus-visible:ring-2 focus-visible:ring-accent"
            >
              Undo
            </button>
          </div>
        ) : null}

        {total === 0 ? (
          <div role="status" className="mt-6 rounded-lg border border-ink/10 bg-surface p-4 text-sm text-ink-muted">
            No todos yet. Add one above to get started.
          </div>
        ) : null}

        <TodoList todos={visibleTodos} onToggle={toggle} onDelete={remove} onUpdateTitle={updateTitle} />
      </main>
    </div>
  );
}

