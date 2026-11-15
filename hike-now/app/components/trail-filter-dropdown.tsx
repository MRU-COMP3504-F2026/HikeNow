"use client";

import Dropdown, { type DropdownOption } from "./dropdown";

export type TrailFilter =
  | "difficulty-asc"
  | "difficulty-desc"
  | "length-asc"
  | "length-desc"
  | "name-asc"
  | "name-desc";

/** Las opciones de ordenación y restablecimiento de rutas. */
export const TRAIL_FILTER_OPTIONS: DropdownOption<TrailFilter | "clear">[] = [
  { value: "difficulty-asc", label: "Difficulty (Low to High)" },
  { value: "difficulty-desc", label: "Difficulty (High to Low)" },
  { value: "length-asc", label: "Length (Short to Long)" },
  { value: "length-desc", label: "Length (Long to Short)" },
  { value: "name-asc", label: "Name (A → Z)" },
  { value: "name-desc", label: "Name (Z → A)" },
  { value: "clear", label: "Clear filter" },
];

export type TrailFilterDropdownProps = {
  value?: TrailFilter;
  onChange: (value: TrailFilter) => void;
  onClear: () => void;
  className?: string;
};

/** Desplegable para ordenar/filtrar rutas con las 6 opciones de la maqueta. */
export default function TrailFilterDropdown({
  value,
  onChange,
  onClear,
  className,
}: TrailFilterDropdownProps) {
  return (
    <Dropdown
      options={TRAIL_FILTER_OPTIONS}
      value={value}
      onChange={(selected) => {
        if (selected === "clear") {
          onClear();
        } else {
          onChange(selected);
        }
      }}
      placeholder="Apply filters to your search"
      label="Filter trails"
      className={className}
      triggerContent={
        <>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 4h18l-7 8v6l-4 2v-8L3 4Z" />
          </svg>
          {value && (
            <span
              aria-hidden="true"
              className="absolute right-1 top-1 size-2 rounded-full bg-primary"
            />
          )}
        </>
      }
      triggerClassName={[
        "relative flex size-10 cursor-pointer items-center justify-center rounded-full text-primary transition-colors hover:bg-surface",
        value ? "bg-primary/10" : "",
      ].join(" ")}
      listClassName="right-0 left-auto min-w-64"
    />
  );
}
