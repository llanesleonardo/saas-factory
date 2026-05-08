export function BulkActions({
  onToggleAll,
  onClearCompleted,
}: {
  onToggleAll: () => void;
  onClearCompleted: () => void;
}) {
  return (
    <>
      <button type="button" onClick={onToggleAll} aria-label="Toggle all todos">
        Toggle all
      </button>
      <button type="button" onClick={onClearCompleted} aria-label="Clear completed todos">
        Clear completed
      </button>
    </>
  );
}

