import Link from "next/link";
import type { ComponentType } from "react";
import { MehIcon, MountainIcon, SadIcon, SmileIcon } from "./icons";
import StarRating from "./star-rating";
import Tag from "./tag";

export type ReviewCondition = "good" | "fair" | "poor";

export type ReviewCardProps = {
  /** Nota de 0 a 5. */
  rating: number;
  /** Condición del sendero. Se resalta la cara elegida. */
  condition?: ReviewCondition;
  /** Tags de la review (Muddy, Snowy…). */
  tags?: string[];
  /** Título corto de la review, p. ej. "Nice place". */
  title?: string;
  /** Comentario. */
  comments?: string;
  /** Nombre de quien escribió la review. Si falta no se muestra el autor. */
  author?: string;
  /** Nombre del sendero. Se muestra encima del título (útil en el perfil). */
  trailName?: string;
  /** Enlace del sendero. Si se pasa, trailName es un enlace. */
  trailHref?: string;
  /** URL del avatar. Si falta se muestra la inicial. */
  avatarUrl?: string;
  /** Fecha de la review. Si falta no se muestra. */
  date?: Date | string;
  /** Fotos de la review (se muestran hasta 2). */
  photos?: string[];
  className?: string;
};

const conditions: { value: ReviewCondition; label: string; Icon: ComponentType<{ size?: number; className?: string }> }[] = [
  { value: "good", label: "Good", Icon: SmileIcon },
  { value: "fair", label: "Fair", Icon: MehIcon },
  { value: "poor", label: "Poor", Icon: SadIcon },
];

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function ReviewCard({
  rating,
  condition,
  tags = [],
  title,
  comments,
  author,
  trailName,
  trailHref,
  avatarUrl,
  date,
  photos = [],
  className = "",
}: ReviewCardProps) {
  const shownPhotos = photos.slice(0, 2);

  return (
    <article
      className={[
        "flex flex-col justify-between gap-4 rounded-control border border-border-soft bg-background p-4 sm:flex-row",
        className,
      ].join(" ")}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-4">
          <StarRating value={rating} size={14} />

          {condition && (
            <div role="img" aria-label={`Condition: ${condition}`} className="flex items-center gap-1">
              {conditions.map(({ value, Icon }) => (
                <Icon
                  key={value}
                  size={16}
                  className={value === condition ? "text-primary" : "text-border"}
                />
              ))}
            </div>
          )}

          {tags.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Tags">
              {tags.map((t) => (
                <li key={t}>
                  <Tag className="px-2 py-1 text-[10px]">{t}</Tag>
                </li>
              ))}
            </ul>
          )}
        </div>

        {trailName &&
          (trailHref ? (
            <Link href={trailHref} className="text-small font-medium text-primary underline-offset-2 hover:underline">
              {trailName}
            </Link>
          ) : (
            <span className="text-small font-medium text-primary">{trailName}</span>
          ))}
        {title && <h3 className="text-nav font-medium text-ink">{title}</h3>}
        {comments && <p className="text-small text-text">{comments}</p>}

        {(author || date) && (
          <div className="mt-2 flex items-center gap-2">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="size-6 rounded-full object-cover" />
            ) : (
              <span
                aria-hidden="true"
                className="grid size-6 place-items-center rounded-full bg-primary text-[10px] text-on-primary"
              >
                {author?.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="flex flex-col text-[10px] leading-tight text-text-subtle">
              <span>{author}</span>
              {date && (
                <time dateTime={new Date(date).toISOString()}>{formatDate(date)}</time>
              )}
            </div>
          </div>
        )}
      </div>

      {shownPhotos.length > 0 && (
        <div className="flex shrink-0 gap-4">
          {shownPhotos.map((src, i) =>
            src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt={`Review photo ${i + 1}`} className="size-24 rounded-xl object-cover sm:size-[100px]" />
            ) : (
              <span key={i} className="grid size-24 place-items-center rounded-xl bg-primary text-on-primary sm:size-[100px]">
                <MountainIcon size={48} />
              </span>
            ),
          )}
        </div>
      )}
    </article>
  );
}
