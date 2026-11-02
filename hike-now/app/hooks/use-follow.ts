"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type UseFollowOptions = {
  /** Estado inicial: true si ya se sigue a la persona. */
  initialFollowing?: boolean;
  /**
   * Se llama con el nuevo estado (true = follow, false = unfollow). Aquí se conecta
   * la acción de servidor. Si lanza un error, el estado vuelve al anterior.
   */
  onChange?: (following: boolean) => void | Promise<void>;
};

export type UseFollowResult = {
  /** Estado actual (ya actualizado de forma optimista mientras `pending` es true). */
  following: boolean;
  /** true mientras se espera la respuesta de `onChange`. */
  pending: boolean;
  /** Último error de `onChange` (null si no hubo o si se está reintentando). */
  error: Error | null;
  /** Cambia entre follow y unfollow. */
  toggle: () => Promise<void>;
  /** Pasa a "siguiendo" (no hace nada si ya se sigue). */
  follow: () => Promise<void>;
  /** Pasa a "no siguiendo" (no hace nada si no se sigue). */
  unfollow: () => Promise<void>;
};

/**
 * Estado de un botón Follow/Unfollow: actualización optimista, bloqueo mientras
 * hay una petición en curso y vuelta atrás si `onChange` falla.
 */
export function useFollow({
  initialFollowing = false,
  onChange,
}: UseFollowOptions = {}): UseFollowResult {
  const [following, setFollowingState] = useState(initialFollowing);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Refs para leer siempre el valor actual sin recrear las funciones.
  const followingRef = useRef(initialFollowing);
  const pendingRef = useRef(false);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const setFollowing = useCallback((value: boolean) => {
    followingRef.current = value;
    setFollowingState(value);
  }, []);

  const update = useCallback(
    async (next: boolean) => {
      if (pendingRef.current || followingRef.current === next) return;

      pendingRef.current = true;
      setPending(true);
      setError(null);
      setFollowing(next); // actualización inmediata

      try {
        await onChangeRef.current?.(next);
      } catch (err) {
        setFollowing(!next); // si falla, se deshace
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        pendingRef.current = false;
        setPending(false);
      }
    },
    [setFollowing],
  );

  const toggle = useCallback(() => update(!followingRef.current), [update]);
  const follow = useCallback(() => update(true), [update]);
  const unfollow = useCallback(() => update(false), [update]);

  return { following, pending, error, toggle, follow, unfollow };
}
