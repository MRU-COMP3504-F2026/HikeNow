import type { AvatarTone } from "../chats/types";

const tones: Record<AvatarTone, string> = {
  forest: "bg-primary text-on-primary",
  moss: "bg-primary/75 text-white",
  sage: "bg-primary/10 text-primary",
  stone: "bg-border-soft text-text",
};

const sizes = {
  28: "size-7 text-small",
  36: "size-9 text-small",
  44: "size-11 text-nav",
} as const;

export type AvatarProps = {
  /** Iniciales que se muestran, p. ej. "PN". */
  initials: string;
  tone?: AvatarTone;
  /** Tamaño en px. */
  size?: keyof typeof sizes;
  className?: string;
};

/** Círculo con iniciales. Es decorativo: el nombre siempre va escrito al lado. */
export default function Avatar({
  initials,
  tone = "stone",
  size = 44,
  className = "",
}: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={[
        "grid shrink-0 place-items-center rounded-full font-semibold",
        tones[tone],
        sizes[size],
        className,
      ].join(" ")}
    >
      {initials}
    </span>
  );
}
