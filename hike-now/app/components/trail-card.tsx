"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { updateTrailStatus } from "../actions/trail-status"; // adjust path if needed
import { StarIcon } from "./star-rating";
import TrailStatusDropdown, {
  DEFAULT_TRAIL_STATUS,
  type TrailStatus,
} from "./trail-status-dropdown";


export type TrailCardProps = {
  hikeId: string;
  initialStatus?: TrailStatus;
  isLoggedIn?: boolean;
  name: string;
  location?: string;
  imageUrl: string;
  photoCredit?: {
    author: string;
    source: string;
    authorHref: string;
    sourceHref: string;
  };
  rating: number | null;
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
  hikeId,
  initialStatus = DEFAULT_TRAIL_STATUS,
  isLoggedIn = false,
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
  const [status, setStatus] = useState<TrailStatus>(initialStatus);
  const [prevInitialStatus, setPrevInitialStatus] = useState<TrailStatus>(initialStatus);
  const [isPending, startTransition] = useTransition();

  if (initialStatus !== prevInitialStatus) {
    setPrevInitialStatus(initialStatus);
    setStatus(initialStatus);
  }
  

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  function handleStatusChange(nextStatus: TrailStatus) {
    const previousStatus = status;
    setStatus(nextStatus);

    startTransition(async () => {
      try {
        await updateTrailStatus(hikeId, nextStatus);
      } catch (error) {
        console.error("Failed to update trail status:", error);
        setStatus(previousStatus);
      }
    });
  }

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
          <a href={photoCredit.authorHref} target="_blank" rel="noreferrer">
            <span className="underline">{photoCredit.author}</span> in{" "}
          </a>
          <a href={photoCredit.sourceHref} target="_blank" rel="noreferrer">
            <span className="underline">{photoCredit.source}</span>
          </a>
        </p>
      )}

      <p className="flex items-center gap-1 text-small text-ink">
        {rating !== null && <StarIcon filled size={12} />}
        <span>
          {rating === null ? "N/A" : numberFormat.format(rating)} ·{" "}
          {numberFormat.format(lengthKm)} km · {difficulty} Difficulty
        </span>
      </p>

      {isLoggedIn && (
        <TrailStatusDropdown
          value={status}
          onChange={handleStatusChange}
          label={`Status of ${name}`}
        />
      )}
    </article>
  );
}
