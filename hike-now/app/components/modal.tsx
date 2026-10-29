"use client";

import { useEffect, type ReactNode } from "react";

export type ModalProps = {
  /** Si es false no se renderiza nada. */
  open: boolean;
  /** Se llama al pulsar Escape o al hacer clic fuera del panel. */
  onClose: () => void;
  /** Texto accesible del diálogo. */
  label: string;
  children: ReactNode;
};

/** Capa oscura con un panel centrado. El contenido lo pone quien lo usa. */
export default function Modal({ open, onClose, label, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md"
      >
        {children}
      </div>
    </div>
  );
}
