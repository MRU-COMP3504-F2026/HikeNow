"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CloseIcon, MenuIcon, SearchIcon, UserIcon } from "./icons";
import { navLinks } from "./nav-links";
import favicon2 from '../favicon2.ico';
import { logout } from "@/app/actions/auth";

export type NavbarProps = {
  /** Usuario con sesión iniciada. Si es null/undefined se muestra el botón Login. */
  user?: { email: string; id?: string } | null;
};

const loginClasses =
  "inline-flex items-center justify-center rounded-control bg-ink px-4 py-2.5 text-small font-medium text-white shadow-control transition-colors hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function Avatar() {
  return (
    <span className="grid size-10 place-items-center rounded-full bg-primary text-on-primary shadow-control">
      <UserIcon size={20} />
    </span>
  );
}

/** Avatar + email. Si se conoce el id, es un enlace al perfil del usuario. */
function UserBadge({ user, textClass, onNavigate }: { user: { email: string; id?: string }; textClass: string; onNavigate?: () => void }) {
  const content = (
    <>
      <Avatar />
      <span className={textClass}>{user.email}</span>
    </>
  );
  if (!user.id) return <div className="flex items-center gap-3">{content}</div>;
  return (
    <Link
      href={`/profile/${user.id}`}
      aria-label={`My profile (${user.email})`}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {content}
    </Link>
  );
}

export default function Navbar({ user = null }: NavbarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const linkClasses = (href: string) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return [
      "text-nav font-medium transition-colors",
      active
        ? "text-primary underline underline-offset-4"
        : "text-ink hover:text-primary",
    ].join(" ");
  };

  return (
    <header className="bg-background sticky top-0">
      <div className="flex h-23 items-center gap-4 px-4 md:px-16">
        <Link
          href="/"
          className="text-logo font-black leading-none text-primary"
        >
          <img src={favicon2.src} className="size-10">
          </img>
        </Link>
        <Link
          href="/"
          className="text-logo font-black leading-none text-primary"
        >
          Hike Now!
        </Link>

        {/* Buscador (solo escritorio): lleva a /search con hikers y rutas. */}
        <form
          role="search"
          action="/search"
          method="get"
          className="mx-auto hidden h-8 w-48 items-center gap-1 rounded-full border border-border bg-background px-3 md:flex"
        >
          <input
            type="search"
            name="q"
            placeholder="Search"
            aria-label="Search"
            className="min-w-0 flex-1 bg-transparent text-small text-text outline-none placeholder:text-placeholder"
          />
          <button type="submit" aria-label="Search" className="text-ink">
            <SearchIcon size={12} />
          </button>
        </form>

        {/* Navegación (escritorio) */}
        <nav
          aria-label="Main"
          className="hidden items-center gap-9 md:flex"
        >
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} className={linkClasses(href)}>
              {label}
            </Link>
          ))}
          {user ? (
            <div className="flex items-center gap-3">
              <UserBadge user={user} textClass="text-heading text-primary" />
              <form action={logout}>
                <button type="submit" className={loginClasses}>Log out</button>
              </form>
            </div>
          ) : (
            <Link href="/login" className={loginClasses}>
              Login
            </Link>
          )}
        </nav>

        {/* Botón de menú (móvil) */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="ml-auto cursor-pointer text-ink md:hidden"
        >
          {open ? <CloseIcon size={28} /> : <MenuIcon size={28} />}
        </button>
      </div>

      {/* Menú desplegable (móvil) */}
      {open && (
        <nav
          id="mobile-menu"
          aria-label="Mobile"
          className="flex flex-col gap-4 border-t border-border-soft px-4 py-4 md:hidden"
        >
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={linkClasses(href)}
            >
              {label}
            </Link>
          ))}
          {user ? (
            <div className="flex items-center gap-3">
              <UserBadge user={user} textClass="text-small text-primary" onNavigate={() => setOpen(false)} />
              <form action={logout}>
                <button type="submit" className={loginClasses}>Log out</button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className={`${loginClasses} self-start`}
            >
              Login
            </Link>
          )}
        </nav>
      )}

      {/* Franja verde de la marca */}
      <div aria-hidden="true" className="h-6 bg-primary" />
    </header>
  );
}
