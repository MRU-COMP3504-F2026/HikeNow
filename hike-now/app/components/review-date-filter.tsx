"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isReviewDatePeriod, type ReviewDatePeriod } from "../lib/review-date";

const DATE_FILTER_OPTIONS: {
  value: ReviewDatePeriod;
  label: string;
}[] = [
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "year", label: "Annual" },
  { value: "all", label: "All" },
];

export default function ReviewDateFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const periodParam = searchParams.get("period");
  const selectedPeriod = isReviewDatePeriod(periodParam) ? periodParam : "all";

  function handleFilterChange(period: ReviewDatePeriod) {
  const params = new URLSearchParams(searchParams.toString());

  if (period === "all") {
    params.delete("period");
  } else {
    params.set("period", period);
  }

  const query = params.toString();

  router.push(query ? `${pathname}?${query}` : pathname);
}

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-label="Filter reviews by date"
    >
      {DATE_FILTER_OPTIONS.map((option) => {
        const isSelected = selectedPeriod === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleFilterChange(option.value)}
            aria-pressed={isSelected}
            className={[
              "rounded-full border px-4 py-2 text-small font-medium transition-colors",
              isSelected
                ? "border-primary bg-primary text-on-primary"
                : "border-border bg-background text-text hover:bg-surface",
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}