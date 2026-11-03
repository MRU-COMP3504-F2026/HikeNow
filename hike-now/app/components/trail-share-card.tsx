import Link from "next/link";
import type { TrailShare } from "../chats/types";
import { StarIcon } from "./star-rating";

const numberFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

export type TrailShareCardProps = {
  trail: TrailShare;
  className?: string;
};

/** Tarjeta compacta de una ruta compartida dentro de un chat. */
export default function TrailShareCard({ trail, className = "" }: TrailShareCardProps) {
  return (
    <article
      className={[
        "w-full max-w-80 overflow-hidden rounded-control border border-border bg-background",
        className,
      ].join(" ")}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={trail.imageUrl} alt={trail.name} loading="lazy" className="h-28 w-full object-cover" />
      <div className="flex flex-col gap-1.5 p-3">
        <h3 className="text-nav font-medium leading-snug text-ink">
          {trail.name}, {trail.location}
        </h3>
        <p className="flex items-center gap-1 text-small text-ink">
          <StarIcon filled size={12} />
          <span>
            {numberFormat.format(trail.rating)} · {numberFormat.format(trail.lengthKm)} km ·{" "}
            {trail.difficulty} Difficulty
          </span>
        </p>
        <Link
          href={`/reviews/${trail.id}`}
          className="mt-1 w-fit text-small font-medium text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          View trail
        </Link>
      </div>
    </article>
  );
}
