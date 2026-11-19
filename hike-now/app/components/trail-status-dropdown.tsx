"use client";

import Dropdown, { type DropdownOption } from "./dropdown";

export type TrailStatus = "not-started" | "withdrawn" | "completed";

/** Estado por defecto de una ruta. */
export const DEFAULT_TRAIL_STATUS: TrailStatus = "not-started";

/** Opciones del desplegable de estado: "Not started" (por defecto) y, debajo, "Withdrawn" y "Completed". */
export const TRAIL_STATUS_OPTIONS: DropdownOption<TrailStatus>[] = [
  { value: "not-started", label: "Not started" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "completed", label: "Completed" },
];

export type TrailStatusDropdownProps = {
  /** Estado actual. Si no se indica, se muestra "Not started". */
  value?: TrailStatus;
  onChange: (value: TrailStatus) => void;
  className?: string;
};

/** Desplegable para marcar el estado de una ruta (Not started, Withdrawn, Completed). */
export default function TrailStatusDropdown({
  value = DEFAULT_TRAIL_STATUS,
  onChange,
  className,
}: TrailStatusDropdownProps) {
  return (
    <Dropdown
      options={TRAIL_STATUS_OPTIONS}
      value={value}
      onChange={onChange}
      label="Trail status"
      className={className}
    />
  );
}
