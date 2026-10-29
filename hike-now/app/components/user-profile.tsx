import type { ReactNode } from "react";
import { UserIcon } from "./icons";

export type UserProfileProps = {
  /** Nombre que se muestra, p. ej. "Alex". */
  name: string;
  /** Email del usuario. */
  email: string;
  /** Descripción / bio. */
  description?: string | null;
  /** URL del avatar. Si falta se muestra el icono de usuario. */
  avatarUrl?: string;
  /** Cifras bajo la descripción, p. ej. [{ label: "Reviews", value: 4 }]. */
  stats?: { label: string; value: string | number }[];
  /** Hueco a la derecha de la cabecera (aquí irá el botón Follow/Following). */
  action?: ReactNode;
  className?: string;
};

/** Cabecera del perfil: avatar, nombre, email, descripción y estadísticas. */
export default function UserProfile({
  name,
  email,
  description,
  avatarUrl,
  stats = [],
  action,
  className = "",
}: UserProfileProps) {
  return (
    <section
      aria-label={`Profile of ${name}`}
      className={[
        "flex flex-col gap-6 sm:flex-row sm:items-start",
        className,
      ].join(" ")}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className="size-28 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="grid size-28 shrink-0 place-items-center rounded-full bg-primary text-on-primary shadow-control">
          <UserIcon size={56} />
        </span>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <h1 className="text-title font-semibold text-ink">{name}</h1>
          <p className="text-heading text-primary">{email}</p>
        </div>

        {description && (
          <p className="max-w-2xl text-small leading-5 text-text">
            {description}
          </p>
        )}

        {stats.length > 0 && (
          <dl className="flex flex-wrap gap-8">
            {stats.map(({ label, value }) => (
              <div key={label} className="flex flex-col">
                <dt className="text-small text-text-subtle">{label}</dt>
                <dd className="text-heading font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {action && <div className="sm:self-start">{action}</div>}
    </section>
  );
}
