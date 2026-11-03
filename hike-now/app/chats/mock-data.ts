import type { ChatPerson, ChatThread, MentionOption, TrailShare } from "./types";

// DATOS DE EJEMPLO: todavía no hay tabla de mensajes en la base de datos.
// Cuando exista, estas constantes se sustituyen por la consulta real.

/** Usuario actual (el mismo que se muestra en la barra de navegación). */
export const ME: ChatPerson = {
  id: "me",
  name: "You",
  handle: "@hshar360",
  initials: "ME",
  tone: "forest",
};

const priya: ChatPerson = { id: "priya", name: "Priya Nair", handle: "@priya.n", initials: "PN", tone: "moss" };
const lucas: ChatPerson = { id: "lucas", name: "Lucas Torres", handle: "@lucas.t", initials: "LT", tone: "sage" };
const hana: ChatPerson = { id: "hana", name: "Hana Sato", handle: "@hana.s", initials: "HS", tone: "stone" };
const marcus: ChatPerson = { id: "marcus", name: "Marcus Bell", handle: "@marcus.b", initials: "MB", tone: "forest" };
const sofia: ChatPerson = { id: "sofia", name: "Sofia Marchetti", handle: "@sofia.hikes", initials: "SM", tone: "stone" };
const daniel: ChatPerson = { id: "daniel", name: "Daniel Okafor", handle: "@daniel.o", initials: "DO", tone: "sage" };

// Rutas reales de temporary_data/hikes.json (mismos ids que /reviews/[id]).
export const TRAILS: Record<string, TrailShare> = {
  johnston: {
    id: "2b7e7be9-22a9-4fe6-812e-580a0959e458",
    name: "Johnston Canyon",
    location: "Alberta, Canada",
    rating: 4.5,
    lengthKm: 12.4,
    difficulty: "Moderate",
    imageUrl:
      "https://images.unsplash.com/photo-1533587032585-7c78bbeef622?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
  },
  cory: {
    id: "8a47f572-49ed-4122-b135-aa19dbad1b3f",
    name: "Cory Pass – Mt. Edith",
    location: "Alberta, Canada",
    rating: 4.7,
    lengthKm: 15.02,
    difficulty: "High",
    imageUrl:
      "https://images.unsplash.com/photo-1596570630516-7c7355b14a55?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
  },
  oldFort: {
    id: "8d7c0e27-c4f7-4960-baf0-6d86f021f6e8",
    name: "Old Fort Point",
    location: "Alberta, Canada",
    rating: 4.3,
    lengthKm: 4.05,
    difficulty: "Easy",
    imageUrl: "https://s0.wklcdn.com/image_43/1313891/48166025/32325573Master.jpg",
  },
  yoho: {
    id: "44c189dd-83ec-4b94-9abe-9567daad4839",
    name: "Yoho Lake - Ensign Creek",
    location: "British Columbia, Canada",
    rating: 4.8,
    lengthKm: 30.86,
    difficulty: "Very High",
    imageUrl:
      "https://images.unsplash.com/photo-1599164878268-160a62fabc52?q=80&w=1032&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
  },
};

/** Rutas que se ofrecen en el botón "Share a trail". */
export const SHAREABLE_TRAILS: TrailShare[] = [TRAILS.oldFort, TRAILS.cory, TRAILS.yoho];

/** Personas mencionables: gente con la que el usuario hizo una ruta. */
export const MENTION_OPTIONS: MentionOption[] = [
  { person: lucas, trail: "Cory Pass – Mt. Edith · Oct 12" },
  { person: priya, trail: "Cory Pass – Mt. Edith · Oct 12" },
  { person: hana, trail: "Old Fort Point · Sep 27" },
  { person: daniel, trail: "Johnston Canyon · Sep 14" },
];

export const INITIAL_THREADS: ChatThread[] = [
  {
    id: "priya",
    person: priya,
    following: true,
    isRequest: false,
    time: "10m",
    unread: true,
    context: "You hiked Cory Pass – Mt. Edith together · Oct 12",
    messages: [
      { id: "p1", from: "them", kind: "text", text: "Are you free this Saturday? I was thinking Johnston Canyon. The upper falls should be frozen by now." },
      { id: "p2", from: "me", kind: "text", text: "I'm in. Here's the trail so you can check the length." },
      { id: "p3", from: "me", kind: "trail", trail: TRAILS.johnston },
      { id: "p4", from: "them", kind: "text", text: "Perfect. I'll ask @Lucas too, he was with us on Cory Pass." },
      {
        id: "p5",
        from: "them",
        kind: "proposal",
        proposal: {
          trailName: "Johnston Canyon",
          when: "Sat, Nov 7 · 9:00 AM",
          where: "Johnston Canyon trailhead, Banff",
          going: [priya, lucas],
          rsvp: "none",
        },
      },
    ],
  },
  {
    id: "lucas",
    person: lucas,
    following: true,
    isRequest: false,
    time: "2h",
    unread: false,
    context: "You hiked Cory Pass – Mt. Edith together · Oct 12",
    messages: [
      { id: "l1", from: "them", kind: "text", text: "Great day on Cory Pass. I tagged you and @Priya in my review." },
      { id: "l2", from: "me", kind: "text", text: "Thanks! The views from the top were worth the scramble." },
      { id: "l3", from: "them", kind: "text", text: "Next one is Yoho Lake? I hear it is a long one." },
    ],
  },
  {
    id: "hana",
    person: hana,
    following: true,
    isRequest: false,
    time: "Yesterday",
    unread: false,
    context: "You hiked Old Fort Point together · Sep 27",
    messages: [
      { id: "h1", from: "them", kind: "text", text: "Is Old Fort Point okay for a first hike with kids?" },
      { id: "h2", from: "me", kind: "text", text: "Yes, it is about 4 km and rated Easy. Go early, it gets busy." },
      { id: "h3", from: "me", kind: "trail", trail: TRAILS.oldFort },
      { id: "h4", from: "them", kind: "text", text: "That helps a lot, thank you!" },
    ],
  },
  {
    id: "marcus",
    person: marcus,
    following: true,
    isRequest: false,
    time: "Mon",
    unread: false,
    context: "1 trail in common",
    messages: [
      { id: "m1", from: "them", kind: "text", text: "Bring bear spray for Yoho Lake - Ensign Creek. I saw fresh tracks last week." },
      { id: "m2", from: "me", kind: "text", text: "Good to know, thanks for the heads up." },
    ],
  },
  {
    id: "sofia",
    person: sofia,
    following: false,
    isRequest: true,
    time: "5m",
    unread: true,
    context: "2 trails in common · reviewed Cory Pass",
    messages: [
      { id: "s1", from: "them", kind: "text", text: "Hi! I read your Cory Pass review. Was the scramble near the top still icy last weekend?" },
      { id: "s2", from: "them", kind: "text", text: "I'm thinking of going this Saturday and would love a few tips." },
    ],
  },
  {
    id: "daniel",
    person: daniel,
    following: false,
    isRequest: true,
    time: "1h",
    unread: true,
    context: "Hiked Johnston Canyon on Sep 14, same group",
    messages: [
      { id: "d1", from: "them", kind: "text", text: "Hey, we were both on the Johnston Canyon walk in September. I took a few photos of the lower falls." },
      { id: "d2", from: "them", kind: "text", text: "Want me to send them here?" },
    ],
  },
];

/** Hikers sugeridos en el estado vacío (gente que reseñó las mismas rutas). */
export const SUGGESTED_HIKERS: { person: ChatPerson; reviewed: string }[] = [
  { person: priya, reviewed: "Reviewed Cory Pass – Mt. Edith" },
  { person: lucas, reviewed: "Reviewed Johnston Canyon" },
  { person: hana, reviewed: "Reviewed Old Fort Point" },
];
