"use client";

import { useFollow } from "../hooks/use-follow";
import Button from "./button";

export type FollowButtonProps = {
  /** Nombre de la persona a la que se sigue (para los textos accesibles). */
  name: string;
  /** Estado inicial: true si ya se la sigue. */
  initialFollowing?: boolean;
  /**
   * Se llama con el nuevo estado al pulsar. Aquí se conectará la acción de
   * servidor (insertar/borrar en la tabla `follow`). Si lanza un error, el
   * botón vuelve al estado anterior.
   */
  onChange?: (following: boolean) => void | Promise<void>;
  className?: string;
};

/** Botón Follow / Following. Con el ratón encima, "Following" pasa a "Unfollow". */
export default function FollowButton({
  name,
  initialFollowing = false,
  onChange,
  className = "",
}: FollowButtonProps) {
  const { following, pending, toggle } = useFollow({ initialFollowing, onChange });

  return (
    <Button
      variant={following ? "outline" : "primary"}
      aria-pressed={following}
      aria-label={following ? `Unfollow ${name}` : `Follow ${name}`}
      disabled={pending}
      onClick={toggle}
      className={[
        "group min-w-28",
        following ? "hover:border-danger hover:text-danger" : "",
        className,
      ].join(" ")}
    >
      {following ? (
        <>
          <span className="group-hover:hidden group-focus-visible:hidden">Following</span>
          <span className="hidden group-hover:inline group-focus-visible:inline">Unfollow</span>
        </>
      ) : (
        "Follow"
      )}
    </Button>
  );
}
