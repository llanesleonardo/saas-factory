import { RadioGroup } from "@headlessui/react";
import type { Filter } from "../todos.model";

const options: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

export function Filters({
  value,
  onChange,
}: {
  value: Filter;
  onChange: (next: Filter) => void;
}) {
  return (
    <RadioGroup value={value} onChange={onChange}>
      <RadioGroup.Label className="sr-only">Filter todos</RadioGroup.Label>
      <div
        role="group"
        aria-label="Filter todos"
        className="inline-flex rounded-md border border-ink/10 bg-surface p-1 shadow-sm"
      >
        {options.map((o) => (
          <RadioGroup.Option key={o.value} value={o.value} className="focus:outline-none">
            {({ checked }) => (
              <button
                type="button"
                aria-pressed={checked}
                className={[
                  "rounded-md px-3 py-1.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  checked ? "bg-accent text-white" : "text-ink hover:bg-surface-muted",
                ].join(" ")}
              >
                {o.label}
              </button>
            )}
          </RadioGroup.Option>
        ))}
      </div>
    </RadioGroup>
  );
}

