"use client";

export type StarRatingProps = {
  /** Nota actual (0 a max). Los decimales se redondean (4.2 -> 4 estrellas). */
  value: number;
  /** Número total de estrellas. Por defecto 5. */
  max?: number;
  /** Tamaño de cada estrella en píxeles. Por defecto 15. */
  size?: number;
  /** Si se pasa, las estrellas se pueden pulsar para elegir nota. */
  onChange?: (value: number) => void;
  className?: string;
};

export function StarIcon({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export default function StarRating({
  value,
  max = 5,
  size = 15,
  onChange,
  className = "",
}: StarRatingProps) {
  const rounded = Math.round(value);
  const stars = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <div
      className={["inline-flex items-center gap-[3px] text-primary", className].join(" ")}
      {...(onChange ? {} : { role: "img", "aria-label": `${value} out of ${max} stars` })}
    >
      {stars.map((n) =>
        onChange ? (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`Rate ${n} out of ${max} stars`}
            className="cursor-pointer rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <StarIcon filled={n <= rounded} size={size} />
          </button>
        ) : (
          <StarIcon key={n} filled={n <= rounded} size={size} />
        ),
      )}
    </div>
  );
}
