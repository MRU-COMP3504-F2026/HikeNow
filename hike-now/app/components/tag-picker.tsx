"use client";

import { useState } from "react";

export type TagPickerProps = {
  /** Tags que se pueden elegir. */
  options: string[];
  /** Tags elegidos actualmente. */
  selected: string[];
  /** Se llama con la nueva lista cada vez que se marca o desmarca un tag. */
  onChange: (selected: string[]) => void;
  /** Título del panel. */
  title?: string;
  className?: string;
};

/** Panel verde "Add some tags to your review": buscador + rejilla de tags seleccionables. */
export default function TagPicker({
  options,
  selected,
  onChange,
  title = "Add some tags to your review",
  className = "",
}: TagPickerProps) {
  const [query, setQuery] = useState("");

  const visible = options.filter((o) =>
    o.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const toggle = (tag: string) =>
    onChange(
      selected.includes(tag)
        ? selected.filter((t) => t !== tag)
        : [...selected, tag],
    );

  return (
    <div
      className={[
        "flex flex-col gap-4 rounded-control bg-primary p-6 text-on-primary",
        className,
      ].join(" ")}
    >
      <h2 className="text-center text-heading font-semibold">{title}</h2>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search tags"
        aria-label="Search tags"
        className="rounded-control bg-background px-3 py-2 text-small text-text outline-none placeholder:text-placeholder focus-visible:outline-2 focus-visible:outline-on-primary"
      />

      <div role="group" aria-label="Tags" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {visible.map((tag) => {
          const active = selected.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(tag)}
              className={[
                "cursor-pointer rounded-control border-2 border-on-primary px-3 py-1.5 text-small transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-primary",
                active
                  ? "bg-on-primary text-primary"
                  : "bg-transparent text-on-primary hover:bg-on-primary/15",
              ].join(" ")}
            >
              {tag}
            </button>
          );
        })}
        {visible.length === 0 && (
          <p className="col-span-full text-center text-small">No tags found</p>
        )}
      </div>
    </div>
  );
}
