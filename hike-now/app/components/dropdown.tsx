"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export type DropdownOption<T extends string = string> = {
  /** Valor que se devuelve en onChange. */
  value: T;
  /** Texto que se muestra en la lista. */
  label: string;
};

export type DropdownProps<T extends string = string> = {
  /** Opciones de la lista. */
  options: DropdownOption<T>[];
  /** Valor elegido actualmente (undefined = ninguno). */
  value?: T;
  /** Se llama con el valor de la opción elegida. */
  onChange: (value: T) => void;
  /** Título del panel (p. ej. "Apply filters to your search"). */
  title?: string;
  /** Texto del botón cuando no hay nada elegido. */
  placeholder?: string;
  /** Nombre accesible del desplegable. */
  label?: string;
  className?: string;
  triggerContent?: ReactNode;
  triggerClassName?: string;
  listClassName?: string;
};

/**
 * Lista desplegable reutilizable (panel verde con opciones de borde blanco,
 * como en la maqueta "Filter Page"). Se cierra al elegir, al pulsar Escape
 * o al hacer clic fuera. Teclado: ↑ ↓ Home End Enter Escape.
 */
export default function Dropdown<T extends string = string>({
  options,
  value,
  onChange,
  title,
  placeholder = "Select an option",
  label = "Options",
  className = "",
  triggerContent,
  triggerClassName,
  listClassName = "",
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const openList = () => {
    const i = options.findIndex((o) => o.value === value);
    setActiveIndex(i >= 0 ? i : 0);
    setOpen(true);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % options.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + options.length) % options.length);
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(activeIndex);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div
      ref={rootRef}
      onKeyDown={onKeyDown}
      className={["relative flex flex-col gap-3", className].join(" ")}
    >
      {title && (
        <h2 className="text-center text-heading font-semibold">{title}</h2>
      )}

      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? setOpen(false) : openList())}
        className={[
          triggerClassName ??
            "flex w-full cursor-pointer items-center justify-between gap-2 rounded-control border border-border bg-background px-3 py-2 text-left text-small text-text shadow-control",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        ].join(" ")}
      >
        {triggerContent ?? (
          <>
            <span className={selected ? "" : "text-placeholder"}>
              {selected ? selected.label : placeholder}
            </span>
            <svg
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={open ? "rotate-180 transition-transform" : "transition-transform"}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </>
        )}
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          aria-activedescendant={`${listId}-${activeIndex}`}
          className={[
            "absolute top-full left-0 z-10 mt-1 flex w-full flex-col gap-2 rounded-control bg-primary p-3 text-on-primary shadow-control",
            listClassName,
          ].join(" ")}
        >
          {options.map((option, i) => {
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => choose(i)}
                onMouseEnter={() => setActiveIndex(i)}
                className={[
                  "cursor-pointer rounded-control border-2 border-on-primary px-3 py-1.5 text-center text-small transition-colors",
                  isSelected
                    ? "bg-on-primary text-primary"
                    : i === activeIndex
                      ? "bg-on-primary/15"
                      : "bg-transparent",
                ].join(" ")}
              >
                {option.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
