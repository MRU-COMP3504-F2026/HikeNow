"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type TabItem = {
  id: string;
  label: string;
  content: ReactNode;
};

export type TabsProps = {
  tabs: TabItem[];
  /** Pestaña inicial (por defecto, la primera). */
  defaultTabId?: string;
  /** Se llama al cambiar de pestaña. */
  onChange?: (id: string) => void;
  className?: string;
};

/** Pestañas accesibles (roles tablist/tab/tabpanel). Teclado: ← → Home End. */
export default function Tabs({ tabs, defaultTabId, onChange, className = "" }: TabsProps) {
  const baseId = useId();
  const [activeId, setActiveId] = useState(defaultTabId ?? tabs[0]?.id);
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});

  const select = (id: string) => {
    setActiveId(id);
    onChange?.(id);
    buttons.current[id]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    const target =
      e.key === "ArrowRight" ? (index + 1) % tabs.length
      : e.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (target === null) return;
    e.preventDefault();
    select(tabs[target].id);
  };

  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  return (
    <div className={["flex flex-col gap-6", className].join(" ")}>
      <div role="tablist" className="grid auto-cols-fr grid-flow-col border-b border-border">
        {tabs.map((tab, i) => {
          const selected = tab.id === active?.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                buttons.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(tab.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={[
                "-mb-px cursor-pointer border-b-2 px-4 py-3 text-nav font-medium transition-colors",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
                selected
                  ? "border-primary text-primary"
                  : "border-transparent text-text-subtle hover:text-text",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {active && (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${active.id}`}
          aria-labelledby={`${baseId}-tab-${active.id}`}
        >
          {active.content}
        </div>
      )}
    </div>
  );
}
