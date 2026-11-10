"use client";

import { useMemo, useState } from "react";
import type { hike } from "../db/schema";
import TrailCard from "./trail-card";
import TrailFilterDropdown, { type TrailFilter } from "./trail-filter-dropdown";

export type FeaturedTrail = Pick<
  typeof hike.$inferSelect,
  | "id"
  | "name"
  | "location"
  | "photo"
  | "photoCreditAuthor"
  | "photoCreditSource"
  | "photoCreditAuthorHref"
  | "photoCreditSourceHref"
  | "rating"
  | "length"
  | "difficulty"
>;

const difficultyRank: Record<string, number> = {
  easy: 0,
  moderate: 1,
  medium: 1,
  hard: 2,
  high: 2,
  "very hard": 3,
  "very high": 3,
  extreme: 4,
};

function compareUnknownLast(a: number | undefined, b: number | undefined, descending: boolean) {
  if (a === undefined || !Number.isFinite(a)) {
    return b === undefined || !Number.isFinite(b) ? 0 : 1;
  }
  if (b === undefined || !Number.isFinite(b)) return -1;
  return descending ? b - a : a - b;
}

export function sortFeaturedTrails(trails: FeaturedTrail[], filter?: TrailFilter) {
  if (!filter) return trails;

  const descending = filter.endsWith("desc");
  return trails
    .map((trail, index) => ({ trail, index }))
    .sort(({ trail: a, index: aIndex }, { trail: b, index: bIndex }) => {
      let comparison = 0;

      if (filter.startsWith("difficulty")) {
        const rank = (value: string | null) =>
          value ? difficultyRank[value.replace(/ difficulty$/i, "").toLowerCase()] : undefined;
        comparison = compareUnknownLast(rank(a.difficulty), rank(b.difficulty), descending);
      } else if (filter.startsWith("length")) {
        const length = (value: string | null) =>
          value === null ? undefined : Number(value);
        comparison = compareUnknownLast(length(a.length), length(b.length), descending);
      } else {
        comparison = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        if (descending) comparison *= -1;
      }

      return comparison || aIndex - bIndex;
    })
    .map(({ trail }) => trail);
}

export default function FeaturedTrails({ trails }: { trails: FeaturedTrail[] }) {
  const [filter, setFilter] = useState<TrailFilter>();
  const sortedTrails = useMemo(() => sortFeaturedTrails(trails, filter), [trails, filter]);

  return (
    <>
      <section className="mb-8 flex items-center justify-between">
        <h1 className="text-title font-semibold text-primary underline decoration-2 underline-offset-2">
          Hot picks for Fall ’26
        </h1>
        <TrailFilterDropdown
          value={filter}
          onChange={setFilter}
          className="w-auto"
        />
      </section>

      <section
        className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Featured hiking trails"
      >
        {sortedTrails.map((trail) => (
          <TrailCard
            key={trail.id}
            name={trail.name}
            location={trail.location ?? "Unknown location"}
            imageUrl={trail.photo ?? "/images/placeholder-trail.jpg"}
            photoCredit={
              trail.photoCreditAuthor && trail.photoCreditSource
                ? {
                    author: trail.photoCreditAuthor,
                    source: trail.photoCreditSource,
                    authorHref: trail.photoCreditAuthorHref ?? "#",
                    sourceHref: trail.photoCreditSourceHref ?? "#",
                  }
                : undefined
            }
            rating={Number(trail.rating ?? 0)}
            lengthKm={Number(trail.length ?? 0)}
            difficulty={(trail.difficulty ?? "").replace(" Difficulty", "")}
            href={`/reviews/${trail.id}`}
          />
        ))}
      </section>
    </>
  );
}
