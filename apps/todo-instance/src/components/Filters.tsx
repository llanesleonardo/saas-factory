import type { Filter } from "../todos.model";

export function Filters({
  value,
  onChange,
}: {
  value: Filter;
  onChange: (next: Filter) => void;
}) {
  return (
    <div role="group" aria-label="Filter todos" style={{ display: "flex", gap: 8 }}>
      <button type="button" onClick={() => onChange("all")} aria-pressed={value === "all"}>
        All
      </button>
      <button type="button" onClick={() => onChange("active")} aria-pressed={value === "active"}>
        Active
      </button>
      <button type="button" onClick={() => onChange("completed")} aria-pressed={value === "completed"}>
        Completed
      </button>
    </div>
  );
}

