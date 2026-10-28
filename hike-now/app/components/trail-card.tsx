type TrailCardProps = {
  name: string;
  location: string;
  rating: number;
  length: number;
  difficulty: string;
};

export default function TrailCard({
  name,
  location,
  rating,
  length,
  difficulty,
}: TrailCardProps) {
  return (
    <article className="flex flex-col gap-3">
      {/* Temporary image placeholder.
          Real trail images can be added later without changing the card data structure. */}
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-control bg-primary text-on-primary">
        Trail photo
      </div>

      <div>
        <h2 className="text-heading font-medium text-ink">
          {name}, {location}
        </h2>

        <p className="mt-1 text-small text-text-muted">
          ★ {rating.toFixed(1)} · {length.toFixed(2)} km · {difficulty}
        </p>
      </div>
    </article>
  );
}