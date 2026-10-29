import Link from "next/link";
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  YoutubeIcon,
} from "./icons";
import { navLinks } from "./nav-links";

// Los enlaces sociales son provisionales (#) hasta tener las URLs reales.
const socialLinks = [
  { label: "Facebook", href: "#", Icon: FacebookIcon },
  { label: "LinkedIn", href: "#", Icon: LinkedinIcon },
  { label: "YouTube", href: "#", Icon: YoutubeIcon },
  { label: "Instagram", href: "#", Icon: InstagramIcon },
] as const;

export default function Footer() {
  return (
    <footer className="border-t border-border-soft bg-background">
      <div className="flex flex-col gap-8 px-4 py-10 md:flex-row md:justify-between md:px-16">
        <div className="flex flex-col gap-6">
          <span className="text-heading text-ink">Hike Now!</span>
          <ul className="flex gap-1.5">
            {socialLinks.map(({ label, href, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  aria-label={label}
                  className="grid size-[30px] place-items-center rounded-[3px] text-icon transition-colors hover:text-primary"
                >
                  <Icon size={18} />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <nav aria-label="Footer">
          <ul className="flex flex-col gap-4 md:items-end">
            {navLinks.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="text-small font-medium text-text-muted transition-colors hover:text-primary"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
