import type { ChatPerson, HikeProposal, Rsvp } from "../chats/types";
import Avatar from "./avatar";
import Button from "./button";
import { CalendarIcon, CheckIcon, ClockIcon, MapPinIcon } from "./icons";

export type HikeProposalCardProps = {
  proposal: HikeProposal;
  /** Usuario actual: se añade a la lista de asistentes cuando responde "I'm in". */
  me: ChatPerson;
  onRsvp: (value: Rsvp) => void;
  className?: string;
};

const changeButton =
  "min-h-11 cursor-pointer px-3 text-small text-text-muted underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-primary";

/** Propuesta para quedar a hacer una ruta, con respuesta "I'm in" / "Can't make it". */
export default function HikeProposalCard({
  proposal,
  me,
  onRsvp,
  className = "",
}: HikeProposalCardProps) {
  const going = proposal.rsvp === "yes" ? [...proposal.going, me] : proposal.going;

  return (
    <article
      className={[
        "w-full max-w-sm overflow-hidden rounded-control border border-primary bg-background",
        className,
      ].join(" ")}
    >
      <div className="flex items-center gap-2 bg-primary px-3.5 py-2 text-small font-semibold tracking-wide text-on-primary">
        <CalendarIcon size={14} />
        HIKE PROPOSAL
      </div>

      <div className="flex flex-col gap-2.5 p-3.5">
        <h3 className="text-heading font-semibold text-ink">{proposal.trailName}</h3>
        <p className="flex items-center gap-2 text-small text-text-muted">
          <ClockIcon size={14} />
          {proposal.when}
        </p>
        <p className="flex items-center gap-2 text-small text-text-muted">
          <MapPinIcon size={14} />
          {proposal.where}
        </p>

        <div className="flex items-center gap-2.5">
          <div className="flex pl-2" aria-hidden="true">
            {going.map((person) => (
              <Avatar
                key={person.id}
                initials={person.initials}
                tone={person.tone}
                size={28}
                className="-ml-2 ring-2 ring-background"
              />
            ))}
          </div>
          <span className="text-small text-text-muted">{going.length} going</span>
        </div>

        {proposal.rsvp === "none" && (
          <div className="mt-1 flex gap-2">
            <Button className="min-h-11 flex-1" onClick={() => onRsvp("yes")}>
              I&apos;m in
            </Button>
            <Button variant="outline" className="min-h-11 flex-1" onClick={() => onRsvp("no")}>
              Can&apos;t make it
            </Button>
          </div>
        )}
        {proposal.rsvp === "yes" && (
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-small font-semibold text-primary">
              <CheckIcon size={14} />
              You&apos;re going
            </span>
            <button type="button" className={changeButton} onClick={() => onRsvp("none")}>
              Change
            </button>
          </div>
        )}
        {proposal.rsvp === "no" && (
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-small text-text-muted">You declined this hike</span>
            <button type="button" className={changeButton} onClick={() => onRsvp("none")}>
              Change
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
