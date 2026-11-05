/** Funciones puras para mostrar y buscar hikers y rutas (sin acceso a la base de datos). */

/** Nombre público de un hiker: la parte del email antes de la "@", con la primera letra en mayúscula. */
export function hikerName(email: string): string {
  const local = email.split("@")[0] ?? "";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

/** Enlace al perfil de un hiker. */
export const profileHref = (id: string) => `/profile/${id}`;

const normalize = (text: string) => text.trim().toLowerCase();

/** Hikers cuyo nombre público (parte local del email) o descripción contienen la búsqueda. */
export function matchHikers<T extends { email: string; description?: string | null }>(
  hikers: T[],
  query: string,
): T[] {
  const q = normalize(query);
  if (!q) return [];
  return hikers
    .filter(
      (h) =>
        normalize(h.email.split("@")[0] ?? "").includes(q) ||
        normalize(h.description ?? "").includes(q),
    )
    .sort((a, b) => a.email.localeCompare(b.email));
}

/** Rutas cuyo nombre o ubicación contienen la búsqueda. */
export function matchHikes<T extends { name: string; location?: string | null }>(
  hikes: T[],
  query: string,
): T[] {
  const q = normalize(query);
  if (!q) return [];
  return hikes
    .filter((h) => normalize(h.name).includes(q) || normalize(h.location ?? "").includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));
}
