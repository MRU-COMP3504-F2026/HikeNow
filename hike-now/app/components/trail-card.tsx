import Link from "next/link";
import { StarIcon } from "./star-rating";

export type TrailCardProps = {
  /** Nombre del sendero, p. ej. "Johnston Canyon". */
  name: string;
  /** Ubicación, p. ej. "Alberta, Canada". Se muestra tras el nombre. */
  location?: string;
  /** URL de la foto principal. */
  imageUrl: string;
  /** Crédito de la foto, p. ej. { author: "Jess Snoek", source: "Unsplash" }. */
  photoCredit?: { author: string; source: string; authorHref?: string; sourceHref?: string };
  /** Nota media (0 a 5). */
  rating: number;
  /** Longitud en km. */
  lengthKm: number;
  /** Dificultad, p. ej. "Easy", "Moderate". */
  difficulty: string;
  /** Página de detalle del sendero. */
  href: string;
  className?: string;
};

const numberFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

export default function TrailCard({
  name,
  location,
  imageUrl,
  photoCredit,
  rating,
  lengthKm,
  difficulty,
  href,
  className = "",
}: TrailCardProps) {
  const title = location ? `${name}, ${location}` : name;

  return (
    <article className={["flex flex-col gap-3", className].join(" ")}>
      <Link
        href={href}
        className="group flex flex-col gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={name}
          loading="lazy"
          className="aspect-[4/3] w-full rounded-control object-cover"
        />
        <h3 className="text-heading font-medium leading-snug text-ink group-hover:text-primary">
          {title}
        </h3>
      </Link>

      {photoCredit && (
        <p className="-mt-1 text-small text-text-subtle">
          Photo from{" "}
          <span className="underline">{photoCredit.author}</span> in{" "}
          <span className="underline">{photoCredit.source}</span>
        </p>
      )}

      <p className="flex items-center gap-1 text-small text-ink">
        <StarIcon filled size={12} />
        <span>
          {numberFormat.format(rating)} · {numberFormat.format(lengthKm)} km ·{" "}
          {difficulty} Difficulty
        </span>
      </p>
    </article>
  );
}
