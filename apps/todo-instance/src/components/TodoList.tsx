import { useEffect, useRef, useState } from "react";
import type { Todo } from "../todos.storage";

export function TodoList({
  todos,
  onToggle,
  onDelete,
  onUpdateTitle,
}: {
  todos: Todo[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const editRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editingId !== null) {
      editRef.current?.focus();
      editRef.current?.select();
    }
  }, [editingId]);

  return (
    <ul className="mt-4 space-y-2">
      {todos.map((t) => (
        <li
          key={t.id}
          className="flex items-center gap-3 rounded-lg border border-ink/10 bg-surface px-3 py-2 shadow-sm"
        >
          <label className="flex flex-1 items-center gap-3">
            <input
              type="checkbox"
              checked={t.done}
              onChange={() => onToggle(t.id)}
              className="h-4 w-4 accent-[rgb(var(--color-accent))]"
            />
            {editingId === t.id ? (
              <input
                ref={editRef}
                value={draft}
                aria-label={`Edit todo title: ${t.title}`}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full rounded-md border border-ink/10 bg-surface-muted px-2 py-1 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setEditingId(null);
                    setDraft("");
                    return;
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const trimmed = draft.trim();
                    if (trimmed) {
                      onUpdateTitle(t.id, trimmed);
                    }
                    // Reject empty by reverting (no-op) and exiting edit mode.
                    setEditingId(null);
                    setDraft("");
                  }
                }}
              />
            ) : (
              <span className={["text-sm", t.done ? "line-through text-ink-muted" : "text-ink"].join(" ")}>
                {t.title}
              </span>
            )}
          </label>
          {editingId !== t.id ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(t.id);
                setDraft(t.title);
              }}
              aria-label={`Edit todo: ${t.title}`}
              className="rounded-md border border-ink/10 bg-surface px-2 py-1 text-sm font-medium text-ink shadow-sm outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-accent"
            >
              Edit
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onDelete(t.id)}
            aria-label={`Delete todo: ${t.title}`}
            className="rounded-md border border-ink/10 bg-surface px-2 py-1 text-sm font-medium text-danger shadow-sm outline-none hover:bg-danger/10 focus-visible:ring-2 focus-visible:ring-danger"
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}

