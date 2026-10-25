import type { HTMLAttributes } from "react";

type TagVariant = "solid" | "outline";

export type TagProps = HTMLAttributes<HTMLSpanElement> & {
  /** solid = fondo verde con texto claro, outline = solo borde. */
  variant?: TagVariant;
};

const variants: Record<TagVariant, string> = {
  solid: "bg-primary text-on-primary",
  outline: "border border-primary bg-background text-primary",
};

export default function Tag({
  variant = "solid",
  className = "",
  ...props
}: TagProps) {
  return (
    <span
      className={[
        "inline-flex items-center justify-center rounded-control px-3 py-1.5 text-small leading-none",
        variants[variant],
        className,
      ].join(" ")}
      {...props}
    />
  );
}
