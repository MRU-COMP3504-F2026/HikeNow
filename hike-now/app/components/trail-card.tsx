import Link from "next/link";
import { StarIcon } from "./star-rating";

export type TrailCardProps = {
  name: string;
  location?: string;
  imageUrl: string;
  photoCredit?: { author: string; source: string; authorHref: string; sourceHref: string };
  rating: number;
  lengthKm: number;
  difficulty: string;
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
          <a href={photoCredit.authorHref} target="blank">
            <span className="underline">{photoCredit.author}</span> in{" "}
          </a>
          <a href={photoCredit.sourceHref} target="blank">
            <span className="underline">{photoCredit.source}</span>
          </a>
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
