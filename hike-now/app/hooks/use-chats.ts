"use client";

import { useCallback, useRef, useState } from "react";
import type {
  ChatMessage,
  ChatTab,
  ChatThread,
  Rsvp,
  TrailShare,
} from "../chats/types";
import { nextSaturdayLabel } from "../chats/utils";

export type UseChatsOptions = {
  initialThreads: ChatThread[];
  /** Rutas que se ofrecen en "Share a trail" (se reparten por turnos). */
  shareableTrails: TrailShare[];
};

/**
 * Estado de la pestaña Chats: pestaña activa, búsqueda, conversación abierta y
 * acciones (enviar, aceptar solicitudes, seguir, compartir ruta, proponer salida).
 * Por ahora todo vive en memoria; cuando haya tabla de mensajes, cada acción
 * llamará a su server action.
 */
export function useChats({ initialThreads, shareableTrails }: UseChatsOptions) {
  const [threads, setThreads] = useState(initialThreads);
  const [tab, setTab] = useState<ChatTab>("messages");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(
    () => initialThreads.find((t) => !t.isRequest)?.id ?? null,
  );
  const counter = useRef(0);

  const requestCount = threads.filter((t) => t.isRequest).length;
  const inTab = threads.filter((t) => t.isRequest === (tab === "requests"));
  const query = search.trim().toLowerCase();
  const visibleThreads = inTab.filter(
    (t) => !query || t.person.name.toLowerCase().includes(query),
  );
  const active = inTab.find((t) => t.id === activeId) ?? inTab[0] ?? null;

  const updateThread = useCallback(
    (id: string, change: (thread: ChatThread) => ChatThread) =>
      setThreads((all) => all.map((t) => (t.id === id ? change(t) : t))),
    [],
  );

  const append = useCallback(
    (id: string, build: (messageId: string) => ChatMessage) => {
      const messageId = `local-${counter.current++}`;
      updateThread(id, (t) => ({
        ...t,
        time: "now",
        messages: [...t.messages, build(messageId)],
      }));
    },
    [updateThread],
  );

  const selectTab = useCallback(
    (next: ChatTab) => {
      setTab(next);
      setActiveId(threads.find((t) => t.isRequest === (next === "requests"))?.id ?? null);
    },
    [threads],
  );

  const selectThread = useCallback(
    (id: string) => {
      setActiveId(id);
      updateThread(id, (t) => ({ ...t, unread: false }));
    },
    [updateThread],
  );

  const toggleFollow = useCallback(
    (id: string) => updateThread(id, (t) => ({ ...t, following: !t.following })),
    [updateThread],
  );

  /** Acepta una solicitud: pasa a la bandeja de mensajes. */
  const accept = useCallback(
    (id: string) => {
      updateThread(id, (t) => ({ ...t, isRequest: false, unread: false }));
      setTab("messages");
      setActiveId(id);
    },
    [updateThread],
  );

  /** Borra o bloquea una solicitud. */
  const decline = useCallback(
    (id: string) => {
      setThreads((all) => all.filter((t) => t.id !== id));
      setActiveId((current) => (current === id ? null : current));
    },
    [],
  );

  const sendText = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean || !active) return;
      append(active.id, (id) => ({ id, from: "me", kind: "text", text: clean }));
    },
    [active, append],
  );

  const shareTrail = useCallback(() => {
    if (!active || shareableTrails.length === 0) return;
    const trail = shareableTrails[active.messages.length % shareableTrails.length];
    append(active.id, (id) => ({ id, from: "me", kind: "trail", trail }));
  }, [active, append, shareableTrails]);

  const proposeHike = useCallback(() => {
    if (!active || shareableTrails.length === 0) return;
    const trail = shareableTrails[active.messages.length % shareableTrails.length];
    append(active.id, (id) => ({
      id,
      from: "me",
      kind: "proposal",
      proposal: {
        trailName: trail.name,
        when: nextSaturdayLabel(),
        where: `${trail.name} trailhead`,
        going: [],
        rsvp: "yes",
      },
    }));
  }, [active, append, shareableTrails]);

  const rsvp = useCallback(
    (messageId: string, value: Rsvp) => {
      if (!active) return;
      updateThread(active.id, (t) => ({
        ...t,
        messages: t.messages.map((m) =>
          m.id === messageId && m.kind === "proposal"
            ? { ...m, proposal: { ...m.proposal, rsvp: value } }
            : m,
        ),
      }));
    },
    [active, updateThread],
  );

  return {
    threads,
    visibleThreads,
    active,
    tab,
    search,
    requestCount,
    setSearch,
    selectTab,
    selectThread,
    toggleFollow,
    accept,
    decline,
    sendText,
    shareTrail,
    proposeHike,
    rsvp,
  };
}
