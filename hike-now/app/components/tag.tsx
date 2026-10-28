import type { HTMLAttributes } from "react";
import { CloseIcon } from "./icons";

type TagVariant = "solid" | "outline";

export type TagProps = HTMLAttributes<HTMLSpanElement> & {
  /** solid = fondo verde con texto claro, outline = solo borde. */
  variant?: TagVariant;
  /** Si se pasa, se muestra una ✕ al final y al pulsarla se llama a esta función. */
  onRemove?: () => void;
};

const variants: Record<TagVariant, string> = {
  solid: "bg-primary text-on-primary",
  outline: "border border-primary bg-background text-primary",
};

export default function Tag({
  variant = "solid",
  onRemove,
  className = "",
  children,
  ...props
}: TagProps) {
  return (
    <span
      className={[
        "inline-flex items-center justify-center gap-1.5 rounded-control px-3 py-1.5 text-small leading-none",
        variants[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove tag ${typeof children === "string" ? children : ""}`.trim()}
          className="inline-flex cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          <CloseIcon size={10} />
        </button>
      )}
    </span>
  );
}
