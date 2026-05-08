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
    <ul style={{ marginTop: "1rem", lineHeight: 1.9, paddingLeft: 18 }}>
      {todos.map((t) => (
        <li key={t.id}>
          <label style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={t.done} onChange={() => onToggle(t.id)} />{" "}
            {editingId === t.id ? (
              <input
                ref={editRef}
                value={draft}
                aria-label={`Edit todo title: ${t.title}`}
                onChange={(e) => setDraft(e.target.value)}
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
              <span style={{ textDecoration: t.done ? "line-through" : "none" }}>{t.title}</span>
            )}
          </label>
          {editingId !== t.id ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(t.id);
                setDraft(t.title);
              }}
              style={{ marginLeft: 12 }}
              aria-label={`Edit todo: ${t.title}`}
            >
              Edit
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onDelete(t.id)}
            style={{ marginLeft: 12 }}
            aria-label={`Delete todo: ${t.title}`}
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}

