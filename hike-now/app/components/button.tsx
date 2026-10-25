import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "dark" | "danger" | "outline";
type ButtonSize = "sm" | "md";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Estilo visual: primary (verde), dark (negro), danger (rojo) u outline. */
  variant?: ButtonVariant;
  /** sm = botón de la barra de navegación, md = botón de formulario. */
  size?: ButtonSize;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary/90",
  dark: "bg-ink text-white hover:bg-ink/85",
  danger: "bg-danger text-white hover:bg-danger/90",
  outline:
    "border border-border bg-background text-text hover:bg-surface",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-4 py-2.5",
  md: "px-6 py-3",
};

export default function Button({
  variant = "primary",
  size = "md",
  type = "button",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        "inline-flex items-center justify-center gap-1 rounded-control text-small font-medium shadow-control",
        "transition-colors cursor-pointer",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      ].join(" ")}
      {...props}
    />
  );
}
