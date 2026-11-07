"use client";

import { useEffect } from "react";

export default function ThemeToggle() {
  useEffect(() => {
  const savedTheme = localStorage.getItem("theme");

  const prefersDark =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const shouldUseDark =
    savedTheme === "dark" ||
    (!savedTheme && prefersDark);

  document.documentElement.classList.toggle("dark", shouldUseDark);
}, []);

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle("dark");

    localStorage.setItem("theme", isDark ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle light and dark mode"
      className="flex size-10 items-center justify-center rounded-full border border-border bg-surface text-ink transition-colors hover:bg-border-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <svg
        aria-hidden="true"
        className="theme-moon"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z" />
      </svg>

      <svg
        aria-hidden="true"
        className="theme-sun"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
      </svg>
    </button>
  );
}