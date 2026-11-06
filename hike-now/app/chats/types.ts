/** Color del avatar con iniciales (usa solo los colores de marca). */
export type AvatarTone = "forest" | "moss" | "sage" | "stone";

export type ChatPerson = {
  id: string;
  name: string;
  /** Usuario público, p. ej. "@priya.n". */
  handle: string;
  initials: string;
  tone: AvatarTone;
};

/** Ruta que se comparte dentro de un chat. */
export type TrailShare = {
  id: string;
  name: string;
  location: string;
  rating: number;
  lengthKm: number;
  difficulty: string;
  imageUrl: string;
};

export type Rsvp = "none" | "yes" | "no";

/** Propuesta para quedar a hacer una ruta. */
export type HikeProposal = {
  trailName: string;
  /** Texto ya formateado, p. ej. "Sat, Nov 7 · 9:00 AM". */
  when: string;
  where: string;
  /** Personas que ya han dicho que van (sin contar al usuario actual). */
  going: ChatPerson[];
  /** Respuesta del usuario actual. */
  rsvp: Rsvp;
};

type MessageBase = { id: string; from: "me" | "them"; sender?: ChatPerson };

export type ChatContent =
  | { kind: "text"; text: string }
  | { kind: "trail"; trail: TrailShare }
  | { kind: "proposal"; proposal: HikeProposal };

export type SendChatInput =
  | { kind: "text"; text: string }
  | { kind: "trail" | "proposal"; trailId: string };

export type ChatMessage =
  | (MessageBase & { kind: "text"; text: string })
  | (MessageBase & { kind: "trail"; trail: TrailShare })
  | (MessageBase & { kind: "proposal"; proposal: HikeProposal });

type ChatThreadBase = {
  id: string;
  blocked?: boolean;
  /** True when the viewer has not accepted the conversation or followed its inviter. */
  isRequest: boolean;
  /** Hora del último mensaje, ya formateada ("10m", "Yesterday"…). */
  time: string;
  unread: boolean;
  /** Context shown below the conversation name. */
  context: string;
  messages: ChatMessage[];
};

export type DirectChatThread = ChatThreadBase & {
  kind: "direct";
  person: ChatPerson;
  following: boolean;
};

export type GroupChatThread = ChatThreadBase & {
  kind: "group";
  name: string;
  creator: ChatPerson | null;
  members: ChatPerson[];
};

export type ChatThread = DirectChatThread | GroupChatThread;

/** Persona con la que el usuario hizo una ruta, para poder mencionarla. */
export type MentionOption = {
  person: ChatPerson;
  /** Ruta y fecha, p. ej. "Cory Pass – Mt. Edith · Oct 12". */
  trail: string;
};

export type ChatTab = "messages" | "requests";

/** Trozo de un texto: normal o mención (@nombre). */
export type MessagePart = { text: string; mention: boolean };
