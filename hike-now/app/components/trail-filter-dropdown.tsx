"use client";

import Dropdown, { type DropdownOption } from "./dropdown";

export type TrailFilter =
  | "difficulty-asc"
  | "difficulty-desc"
  | "length-asc"
  | "length-desc"
  | "name-asc"
  | "name-desc";

/** Las 6 opciones de la maqueta "Filter Page". */
export const TRAIL_FILTER_OPTIONS: DropdownOption<TrailFilter>[] = [
  { value: "difficulty-asc", label: "Difficulty (Low to High)" },
  { value: "difficulty-desc", label: "Difficulty (High to Low)" },
  { value: "length-asc", label: "Length (Short to Long)" },
  { value: "length-desc", label: "Length (Long to Short)" },
  { value: "name-asc", label: "Name (A → Z)" },
  { value: "name-desc", label: "Name (Z → A)" },
];

export type TrailFilterDropdownProps = {
  value?: TrailFilter;
  onChange: (value: TrailFilter) => void;
  className?: string;
};

/** Desplegable para ordenar/filtrar rutas con las 6 opciones de la maqueta. */
export default function TrailFilterDropdown({
  value,
  onChange,
  className,
}: TrailFilterDropdownProps) {
  return (
    <Dropdown
      options={TRAIL_FILTER_OPTIONS}
      value={value}
      onChange={onChange}
      placeholder="Apply filters to your search"
      label="Filter trails"
      className={className}
    />
  );
}
