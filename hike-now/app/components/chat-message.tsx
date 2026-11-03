import { parseMentions } from "../chats/utils";
import type { ChatMessage, ChatPerson, Rsvp } from "../chats/types";
import HikeProposalCard from "./hike-proposal-card";
import TrailShareCard from "./trail-share-card";

export type ChatMessageViewProps = {
  message: ChatMessage;
  me: ChatPerson;
  onRsvp: (messageId: string, value: Rsvp) => void;
};

/** Un mensaje del chat: texto (con menciones resaltadas), ruta compartida o propuesta. */
export default function ChatMessageView({ message, me, onRsvp }: ChatMessageViewProps) {
  const mine = message.from === "me";

  return (
    <div className={["flex", mine ? "justify-end" : "justify-start"].join(" ")}>
      {message.kind === "text" && (
        <p
          className={[
            "max-w-[75%] whitespace-pre-wrap rounded-control px-3.5 py-2.5 text-nav leading-relaxed",
            mine ? "bg-primary text-on-primary" : "border border-border-soft bg-surface text-text",
          ].join(" ")}
        >
          {parseMentions(message.text).map((part, i) =>
            part.mention ? (
              <span
                key={i}
                className={[
                  "rounded-sm px-1 font-semibold",
                  mine ? "bg-on-primary/20" : "bg-primary/15 text-primary",
                ].join(" ")}
              >
                {part.text}
              </span>
            ) : (
              <span key={i}>{part.text}</span>
            ),
          )}
        </p>
      )}
      {message.kind === "trail" && <TrailShareCard trail={message.trail} />}
      {message.kind === "proposal" && (
        <HikeProposalCard
          proposal={message.proposal}
          me={me}
          onRsvp={(value) => onRsvp(message.id, value)}
        />
      )}
    </div>
  );
}
