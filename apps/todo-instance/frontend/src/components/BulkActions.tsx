export function BulkActions({
  onToggleAll,
  onClearCompleted,
}: {
  onToggleAll: () => void;
  onClearCompleted: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onToggleAll}
        aria-label="Toggle all todos"
        className="rounded-md border border-ink/10 bg-surface px-3 py-2 text-sm font-medium text-ink shadow-sm outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-accent"
      >
        Toggle all
      </button>
      <button
        type="button"
        onClick={onClearCompleted}
        aria-label="Clear completed todos"
        className="rounded-md border border-ink/10 bg-surface px-3 py-2 text-sm font-medium text-ink shadow-sm outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-accent"
      >
        Clear completed
      </button>
    </>
  );
}

