"use client";

import { useFollow } from "../hooks/use-follow";
import { useAuthenticatedAction } from "../hooks/use-authenticated-action";
import Button from "./button";
import { useRouter } from "next/navigation";
import { followUser, unfollowUser } from "../actions/follows";
import { startConversation } from "../actions/chats";

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
  followerId?: string;
  followeeId?: string;
};

/** Botón Follow / Following. Con el ratón encima, "Following" pasa a "Unfollow". */
export default function FollowButton({
  name,
  initialFollowing = false,
  onChange,
  className = "",
  followerId,
  followeeId,
}: FollowButtonProps) {
  const router = useRouter();
  const { following, pending, error, toggle } = useFollow({
    initialFollowing,
    onChange: onChange ?? (followeeId ? async (next) => {
      if (!followerId) throw new Error("Sign in before following this hiker.");
      if (next) await followUser(followerId, followeeId);
      else await unfollowUser(followerId, followeeId);
    } : undefined),
  });
  const auth = useAuthenticatedAction();

  return (
    <>
      <Button
        variant={following ? "outline" : "primary"}
        aria-pressed={following}
        aria-label={following ? `Unfollow ${name}` : `Follow ${name}`}
        disabled={pending || auth.pending}
        onClick={() => { void auth.run(toggle); }}
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
      {following && followeeId && (
        <Button
          variant="outline"
          disabled={pending || auth.pending}
          onClick={() => { void auth.run(async () => {
            const id = await startConversation(followeeId);
            router.push(`/chats?thread=${id}`);
          }); }}
        >
          Message
        </Button>
      )}
      {(auth.error || error) && (
        <p role="alert" className="mt-2 text-small text-danger">
          {auth.error ?? "Could not update the follow status. Please try again."}
        </p>
      )}
    </>
  );
}
