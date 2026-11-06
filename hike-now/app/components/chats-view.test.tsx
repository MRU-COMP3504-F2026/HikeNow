import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  INITIAL_THREADS,
  ME,
  MENTION_OPTIONS,
  SHAREABLE_TRAILS,
  SUGGESTED_HIKERS,
} from "../chats/mock-data";
import type { ChatPerson, ChatThread, GroupChatThread } from "../chats/types";
import ChatsView, { type ChatsViewProps } from "./chats-view";

const { hasActiveSession, push, getChatThreads, markChatRead, sendChatMessage, updateChatRequest, respondToProposal, startConversation, createGroupConversation, followUser, unfollowUser } = vi.hoisted(() => ({
  hasActiveSession: vi.fn(), push: vi.fn(), getChatThreads: vi.fn(), markChatRead: vi.fn(),
  sendChatMessage: vi.fn(), updateChatRequest: vi.fn(), respondToProposal: vi.fn(),
  startConversation: vi.fn(), createGroupConversation: vi.fn(), followUser: vi.fn(), unfollowUser: vi.fn(),
}));
vi.mock("../actions/chats", () => ({ getChatThreads, markChatRead, sendChatMessage, updateChatRequest, respondToProposal, startConversation, createGroupConversation }));
vi.mock("../actions/follows", () => ({ followUser, unfollowUser }));
vi.mock("@/app/actions/auth", () => ({ hasActiveSession }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
let stored: ChatThread[];
beforeEach(() => {
  vi.resetAllMocks();
  hasActiveSession.mockResolvedValue(true);
  getChatThreads.mockImplementation(async () => structuredClone(stored));
  markChatRead.mockImplementation(async (id) => {
    stored = stored.map((thread) => thread.id === id ? { ...thread, unread: false } : thread);
  });
  updateChatRequest.mockImplementation(async (id, action) => {
    stored = action === "accept"
      ? stored.map((thread) => thread.id === id ? { ...thread, isRequest: false } : thread)
      : stored.filter((thread) => thread.id !== id);
  });
  unfollowUser.mockImplementation(async (_, personId) => {
    stored = stored.map((thread) => thread.kind === "direct" && thread.person.id === personId ? { ...thread, following: false } : thread);
  });
  followUser.mockImplementation(async (_, personId) => {
    stored = stored.map((thread) => thread.kind === "direct" && thread.person.id === personId ? { ...thread, following: true } : thread);
  });
  sendChatMessage.mockImplementation(async (id, input) => {
    stored = stored.map((thread) => thread.id === id ? {
      ...thread,
      messages: [...thread.messages, {
        id: `saved-${thread.messages.length}`, from: "me",
        ...(input.kind === "text" ? { kind: "text", text: input.text } :
          input.kind === "trail" ? { kind: "trail", trail: SHAREABLE_TRAILS.find((trail) => trail.id === input.trailId)! } :
          { kind: "proposal", proposal: { trailName: "Trail", when: "Saturday", where: "Trailhead", going: [], rsvp: "yes" } }),
      }],
    } : thread);
    return stored.find((thread) => thread.id === id)!.messages.at(-1);
  });
  respondToProposal.mockImplementation(async (id, messageId, value) => {
    stored = stored.map((thread) => thread.id === id ? {
      ...thread, messages: thread.messages.map((message) => message.id === messageId && message.kind === "proposal"
        ? { ...message, proposal: { ...message.proposal, rsvp: value } } : message),
    } : thread);
  });
});

vi.mock("next/link", () => ({
  default: ({
    children,
    ...props
  }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement>>) => (
    <a {...props}>{children}</a>
  ),
}));

function setup(threads: ChatThread[] = INITIAL_THREADS, options: Pick<ChatsViewProps, "contacts" | "initialThreadId"> = {}) {
  stored = structuredClone(threads);
  return render(
    <ChatsView
      initialThreads={threads}
      shareableTrails={SHAREABLE_TRAILS}
      mentionOptions={MENTION_OPTIONS}
      suggestions={SUGGESTED_HIKERS}
      me={ME}
      {...options}
    />,
  );
}

const list = () => screen.getByRole("complementary", { name: "Conversations" });

const groupMembers = [ME, INITIAL_THREADS[0].person, INITIAL_THREADS[1].person];
function groupThread(overrides: Partial<GroupChatThread> = {}): GroupChatThread {
  return {
    id: "group-id", kind: "group", name: "Weekend hikers", creator: ME, members: groupMembers,
    isRequest: false, time: "", unread: false, context: "3 members", messages: [], ...overrides,
  };
}

describe("ChatsView", () => {
  it("offers just one new-chat button and explains how to find recipients when none are followed", () => {
    setup([]);
    expect(screen.queryByRole("button", { name: "New group chat" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    expect(screen.getByRole("dialog", { name: "New chat" })).toBeInTheDocument();
    expect(screen.getByText(/Follow a hiker to start a chat/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Find hikers" })).toHaveAttribute("href", "/search");
    expect(screen.getByRole("button", { name: "Start chat" })).toBeDisabled();
  });

  it("searches followed hikers by name and handle and preserves recipients across searches", () => {
    setup([], { contacts: groupMembers.slice(1) });
    expect(screen.queryByRole("button", { name: "Message Priya Nair" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    const search = screen.getByRole("searchbox", { name: "Search hikers you follow" });
    expect(search).toHaveFocus();
    fireEvent.change(search, { target: { value: "  pRiYa  " } });
    expect(screen.queryByRole("button", { name: "Add Lucas Torres" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add Priya Nair" }));
    expect(screen.getByRole("button", { name: "Priya Nair added" })).toBeDisabled();
    fireEvent.change(search, { target: { value: INITIAL_THREADS[1].person.handle.toUpperCase() } });
    fireEvent.click(screen.getByRole("button", { name: "Add Lucas Torres" }));
    expect(within(screen.getByRole("list", { name: "Selected recipients" })).getByText("Priya Nair")).toBeInTheDocument();
    expect(screen.getByLabelText("Group name (optional)")).toBeInTheDocument();
    fireEvent.change(search, { target: { value: "not-followed" } });
    expect(screen.getByRole("status")).toHaveTextContent("No followed hikers match");
    expect(screen.getByRole("button", { name: "Remove Lucas Torres" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove Lucas Torres" }));
    expect(screen.queryByLabelText("Group name (optional)")).not.toBeInTheDocument();
    expect(createGroupConversation).not.toHaveBeenCalled();
  });

  it("creates and immediately opens a group with followed hikers", async () => {
    createGroupConversation.mockImplementation(async () => {
      const group = groupThread();
      stored = [group];
      return group;
    });
    setup([], { contacts: groupMembers.slice(1) });
    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Priya Nair" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Lucas Torres" }));
    fireEvent.change(screen.getByLabelText("Group name (optional)"), { target: { value: "  Weekend hikers  " } });
    fireEvent.click(screen.getByRole("button", { name: "Start chat" }));
    await waitFor(() => expect(createGroupConversation).toHaveBeenCalledWith("Weekend hikers", ["priya", "lucas"]));
    expect(await screen.findByRole("heading", { name: "Weekend hikers" })).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "New chat" })).not.toBeInTheDocument();
    expect(startConversation).not.toHaveBeenCalled();
    expect(list()).toHaveClass("hidden");
  });

  it("enforces the 15-member limit including the creator and caps automatic group names", async () => {
    const contacts: ChatPerson[] = Array.from({ length: 15 }, (_, index) => ({
      id: `hiker-${index}`, name: `Hiker ${index}`, handle: `@hiker${index}`, initials: "H", tone: "moss",
    }));
    createGroupConversation.mockImplementation(async (name) =>
      groupThread({ name, members: [ME, ...contacts.slice(1)] }));
    setup([], { contacts });
    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    for (let index = 0; index < 14; index++) {
      fireEvent.click(screen.getByRole("button", { name: `Add Hiker ${index}` }));
    }
    expect(screen.getByText("14 / 14 recipients (up to 15 members including you)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Hiker 14" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Remove Hiker 0" }));
    expect(screen.getByRole("button", { name: "Add Hiker 14" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Add Hiker 14" }));
    expect(within(screen.getByRole("list", { name: "Selected recipients" })).getAllByRole("listitem")).toHaveLength(14);
    fireEvent.click(screen.getByRole("button", { name: "Start chat" }));
    const name = contacts.slice(1).map((person) => person.name).join(", ").slice(0, 100);
    await waitFor(() => expect(createGroupConversation).toHaveBeenCalledWith(name, contacts.slice(1).map((person) => person.id)));
    expect(name).toHaveLength(100);
  });

  it("keeps the form and selections when group creation fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    createGroupConversation.mockRejectedValue(new Error("database unavailable"));
    setup([], { contacts: groupMembers.slice(1) });
    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Priya Nair" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Lucas Torres" }));
    fireEvent.change(screen.getByLabelText("Group name (optional)"), { target: { value: "Weekend hikers" } });
    fireEvent.click(screen.getByRole("button", { name: "Start chat" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not complete this action");
    expect(screen.getByLabelText("Group name (optional)")).toHaveValue("Weekend hikers");
    expect(screen.getByRole("button", { name: "Remove Priya Nair" })).toBeInTheDocument();
    expect(within(list()).queryByText("Weekend hikers")).not.toBeInTheDocument();
  });

  it("creates a group named after its recipients without requiring a group name", async () => {
    createGroupConversation.mockImplementation(async (name) => groupThread({ name }));
    setup([], { contacts: groupMembers.slice(1) });
    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Priya Nair" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Lucas Torres" }));
    fireEvent.click(screen.getByRole("button", { name: "Start chat" }));
    await waitFor(() => expect(createGroupConversation).toHaveBeenCalledWith("Priya Nair, Lucas Torres", ["priya", "lucas"]));
    expect(await screen.findByRole("heading", { name: "Priya Nair, Lucas Torres" })).toBeInTheDocument();
  });

  it("cancels the picker without creating a chat, resets selections, and restores focus", () => {
    setup([], { contacts: groupMembers.slice(1) });
    const newChat = screen.getByRole("button", { name: "New chat" });
    newChat.focus();
    fireEvent.click(newChat);
    fireEvent.click(screen.getByRole("button", { name: "Add Priya Nair" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog", { name: "New chat" })).not.toBeInTheDocument();
    expect(newChat).toHaveFocus();
    fireEvent.click(newChat);
    expect(screen.queryByRole("list", { name: "Selected recipients" })).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "New chat" })).not.toBeInTheDocument();
    expect(startConversation).not.toHaveBeenCalled();
    expect(createGroupConversation).not.toHaveBeenCalled();
  });

  it("keeps keyboard focus inside the picker", () => {
    setup([], { contacts: groupMembers.slice(1) });
    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    const search = screen.getByRole("searchbox", { name: "Search hikers you follow" });
    const cancel = screen.getByRole("button", { name: "Cancel" });
    fireEvent.keyDown(search, { key: "Tab", shiftKey: true });
    expect(cancel).toHaveFocus();
    fireEvent.keyDown(cancel, { key: "Tab" });
    expect(search).toHaveFocus();
    screen.getByRole("button", { name: "New chat" }).focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(search).toHaveFocus();
  });

  it("blocks duplicate submissions and closing the picker while saving", async () => {
    let finish!: (group: GroupChatThread) => void;
    createGroupConversation.mockReturnValue(new Promise<GroupChatThread>((resolve) => { finish = resolve; }));
    setup([], { contacts: groupMembers.slice(1) });
    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Priya Nair" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Lucas Torres" }));
    fireEvent.click(screen.getByRole("button", { name: "Start chat" }));
    await waitFor(() => expect(createGroupConversation).toHaveBeenCalledOnce());
    expect(screen.getByRole("button", { name: "Starting..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(screen.getByRole("form", { name: "Start a new chat" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("dialog", { name: "New chat" })).toBeInTheDocument();
    await act(async () => finish(groupThread()));
    expect(screen.queryByRole("dialog", { name: "New chat" })).not.toBeInTheDocument();
    expect(createGroupConversation).toHaveBeenCalledOnce();
  });

  it("checks the session before starting a new chat", async () => {
    hasActiveSession.mockResolvedValue(false);
    setup([], { contacts: groupMembers.slice(1) });
    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Priya Nair" }));
    fireEvent.click(screen.getByRole("button", { name: "Start chat" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
    expect(startConversation).not.toHaveBeenCalled();
    expect(createGroupConversation).not.toHaveBeenCalled();
  });

  it("shows group members and identifies each incoming sender", () => {
    const group = groupThread({
      messages: [
        { id: "a", from: "them", sender: groupMembers[1], kind: "text", text: "Hello from Priya" },
        { id: "b", from: "them", sender: groupMembers[2], kind: "text", text: "Hello from Lucas" },
      ],
    });
    setup([group]);
    expect(screen.getByRole("heading", { name: "Weekend hikers" })).toBeInTheDocument();
    expect(within(list()).getByText("Lucas Torres: Hello from Lucas")).toBeInTheDocument();
    expect(screen.getByText("Hello from Priya")).toBeInTheDocument();
    expect(screen.getAllByText("Priya Nair").some((element) => element.tagName === "SPAN")).toBe(true);
    fireEvent.click(screen.getByText("View members"));
    expect(screen.getByRole("link", { name: "Lucas Torres" })).toHaveAttribute("href", "/profile/lucas");
    expect(screen.queryByRole("button", { name: /Unfollow/ })).not.toBeInTheDocument();
  });

  it("lets a recipient accept or decline a group request", async () => {
    const invitation = groupThread({ creator: groupMembers[1], isRequest: true });
    setup([invitation]);
    getChatThreads.mockRejectedValue(new Error("refresh unavailable"));
    fireEvent.click(screen.getByRole("tab", { name: /Requests/ }));
    expect(screen.getByText("Priya Nair invited you to this group")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Block" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    await waitFor(() => expect(updateChatRequest).toHaveBeenCalledWith("group-id", "accept"));
    expect(await screen.findByLabelText("Message")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("declines a group invitation without blocking other members", async () => {
    setup([groupThread({ creator: groupMembers[1], isRequest: true })]);
    fireEvent.click(screen.getByRole("tab", { name: /Requests/ }));
    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    await waitFor(() => expect(updateChatRequest).toHaveBeenCalledWith("group-id", "delete"));
    expect(screen.queryByRole("heading", { name: "Weekend hikers" })).not.toBeInTheDocument();
  });

  it("requires confirmation before leaving a group", async () => {
    setup([groupThread()]);
    fireEvent.click(screen.getByRole("button", { name: "Leave group" }));
    expect(screen.getByRole("group", { name: "Confirm leaving group" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(updateChatRequest).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Leave group" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm leave" }));
    await waitFor(() => expect(updateChatRequest).toHaveBeenCalledWith("group-id", "block"));
  });

  it("refreshes incoming database messages every ten seconds", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    try {
      setup([{ ...INITIAL_THREADS[0], unread: false }]);
      stored[0].messages.push({ id: "incoming", from: "them", kind: "text", text: "New incoming message" });
      await act(async () => { await vi.advanceTimersByTimeAsync(9999); });
      expect(screen.queryByText("New incoming message")).not.toBeInTheDocument();
      await act(async () => { await vi.advanceTimersByTimeAsync(1); });
      expect(screen.getAllByText("New incoming message")).toHaveLength(2);
      expect(getChatThreads).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens the conversation selected from a profile, including on mobile", () => {
    setup(INITIAL_THREADS, { initialThreadId: INITIAL_THREADS[1].id });
    expect(screen.getByRole("heading", { name: INITIAL_THREADS[1].person.name })).toBeInTheDocument();
    expect(list()).toHaveClass("hidden");
  });

  it("starts a saved conversation with a followed hiker from an empty inbox", async () => {
    const thread = INITIAL_THREADS[0];
    startConversation.mockImplementation(async () => {
      stored = [{ ...thread, unread: false, messages: [] }];
      return thread.id;
    });
    setup([], { contacts: [thread.person] });
    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    fireEvent.click(screen.getByRole("button", { name: `Add ${thread.person.name}` }));
    fireEvent.click(screen.getByRole("button", { name: "Start chat" }));
    await waitFor(() => expect(startConversation).toHaveBeenCalledWith(thread.person.id));
    expect(await screen.findByRole("heading", { name: thread.person.name })).toBeInTheDocument();
    expect(screen.queryByText("HIKE PROPOSAL")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
    expect(createGroupConversation).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "New chat" })).not.toBeInTheDocument();
  });

  it("shows a database save error and retains the unsent draft", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    sendChatMessage.mockRejectedValue(new Error("database unavailable"));
    setup();
    const input = screen.getByLabelText("Message");
    fireEvent.change(input, { target: { value: "Keep my draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not complete this action");
    expect(input).toHaveValue("Keep my draft");
    expect(screen.queryByText("Keep my draft")).not.toBeInTheDocument();
  });

  it("persists blocking separately from deleting a request", async () => {
    setup();
    fireEvent.click(screen.getByRole("tab", { name: /Requests/ }));
    fireEvent.click(screen.getByRole("button", { name: "Block" }));
    await waitFor(() => expect(updateChatRequest).toHaveBeenCalledWith(INITIAL_THREADS.find((thread) => thread.isRequest)!.id, "block"));
  });

  it("does not offer a composer in a blocked conversation", () => {
    setup([{ ...INITIAL_THREADS[0], blocked: true }]);
    expect(screen.getByRole("status")).toHaveTextContent("conversation is blocked");
    expect(screen.queryByLabelText("Message")).not.toBeInTheDocument();
  });

  it("opens the first conversation and lists the others", () => {
    setup();

    expect(screen.getByRole("heading", { name: "Priya Nair" })).toBeInTheDocument();
    expect(within(list()).getByText("Lucas Torres")).toBeInTheDocument();
    expect(within(list()).getByText("Marcus Bell")).toBeInTheDocument();
    expect(screen.getByText("HIKE PROPOSAL")).toBeInTheDocument();
  });

  it("shows how many message requests are pending", () => {
    setup();
    expect(screen.getByLabelText("2 pending")).toBeInTheDocument();
  });

  it("switches conversations and clears the unread dot", async () => {
    setup();
    expect(within(list()).getByLabelText("Unread")).toBeInTheDocument();

    fireEvent.click(within(list()).getByRole("button", { name: /Lucas Torres/ }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Lucas Torres" })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole("button", { name: "Unfollow Lucas Torres" })).toBeEnabled());
    fireEvent.click(within(list()).getByRole("button", { name: /Priya Nair/ }));
    await waitFor(() => expect(within(list()).queryByLabelText("Unread")).not.toBeInTheDocument());
  });

  it("filters conversations with the search box", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Search chats"), { target: { value: "mar" } });

    expect(within(list()).getByText("Marcus Bell")).toBeInTheDocument();
    expect(within(list()).queryByText("Lucas Torres")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search chats"), { target: { value: "zzz" } });
    expect(screen.getByText("No chats match your search.")).toBeInTheDocument();
  });

  describe("message requests", () => {
    it("shows the request banner instead of the composer", () => {
      setup();
      fireEvent.click(screen.getByRole("tab", { name: /Requests/ }));

      expect(screen.getByRole("heading", { name: "Sofia Marchetti" })).toBeInTheDocument();
      expect(screen.getByText("Sofia wants to message you")).toBeInTheDocument();
      expect(screen.queryByLabelText("Message")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Follow back Sofia Marchetti" })).toBeInTheDocument();
    });

    it("moves an accepted request to Messages", async () => {
      setup();
      fireEvent.click(screen.getByRole("tab", { name: /Requests/ }));
      fireEvent.click(screen.getByRole("button", { name: "Accept" }));

      await waitFor(() => expect(screen.getByRole("tab", { name: "Messages" })).toHaveAttribute("aria-selected", "true"));
      expect(screen.getByLabelText("1 pending")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Sofia Marchetti" })).toBeInTheDocument();
      expect(screen.getByLabelText("Message")).toBeInTheDocument();
    });

    it("removes a deleted request", async () => {
      setup();
      fireEvent.click(screen.getByRole("tab", { name: /Requests/ }));
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));

      await waitFor(() => expect(within(list()).queryByText("Sofia Marchetti")).not.toBeInTheDocument());
      expect(screen.getByRole("heading", { name: "Daniel Okafor" })).toBeInTheDocument();
      expect(screen.getByLabelText("1 pending")).toBeInTheDocument();
    });

    it("shows an empty message when there are no requests left", () => {
      setup(INITIAL_THREADS.filter((t) => !t.isRequest));
      fireEvent.click(screen.getByRole("tab", { name: /Requests/ }));

      expect(screen.getByText("No message requests.")).toBeInTheDocument();
      expect(screen.getByText("No chat selected")).toBeInTheDocument();
    });
  });

  describe("writing", () => {
    it("sends a message with Enter and the Send button", async () => {
      setup();
      const input = screen.getByLabelText("Message");

      fireEvent.change(input, { target: { value: "See you at 9" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(await screen.findByText("See you at 9")).toBeInTheDocument();
      await waitFor(() => expect(input).toHaveValue(""));

      fireEvent.change(input, { target: { value: "Bring water" } });
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
      expect(await screen.findByText("Bring water")).toBeInTheDocument();
    });

    it("ignores empty messages", () => {
      setup();
      const before = screen.getAllByText(/./).length;
      fireEvent.change(screen.getByLabelText("Message"), { target: { value: "   " } });
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
      expect(screen.getAllByText(/./).length).toBe(before);
    });

    it("lets you mention people you hiked with", async () => {
      setup();
      const input = screen.getByLabelText("Message");

      fireEvent.change(input, { target: { value: "Thanks @" } });
      const picker = screen.getByRole("dialog", { name: "Mention a hiking partner" });
      fireEvent.click(within(picker).getByRole("button", { name: /Hana Sato/ }));

      expect(input).toHaveValue("Thanks @Hana ");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      fireEvent.keyDown(input, { key: "Enter" });
      expect(await screen.findByText("@Hana")).toBeInTheDocument();
    });

    it("opens the mention list from the button and closes it with Escape", () => {
      setup();
      fireEvent.click(screen.getByRole("button", { name: "Mention a hiking partner" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      fireEvent.keyDown(screen.getByLabelText("Message"), { key: "Escape" });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("shares a trail card", async () => {
      setup();
      const before = screen.getAllByRole("link", { name: /View trail/ }).length;
      fireEvent.click(screen.getByRole("button", { name: "Share a trail" }));

      await waitFor(() => expect(screen.getAllByRole("link", { name: /View trail/ })).toHaveLength(before + 1));
      const links = screen.getAllByRole("link", { name: /View trail/ });
      expect(links[0].getAttribute("href")).toMatch(/^\/reviews\//);
    });

    it("proposes a hike and lets you change your RSVP", async () => {
      setup();
      fireEvent.click(screen.getByRole("button", { name: "Propose a hike" }));
      await waitFor(() => expect(screen.getAllByText("HIKE PROPOSAL")).toHaveLength(2));

      const going = screen.getAllByText("You're going");
      fireEvent.click(within(going[going.length - 1].closest("div")!.parentElement!).getByRole("button", { name: "Change" }));
      await waitFor(() => expect(screen.getAllByRole("button", { name: "Can't make it" })).toHaveLength(2));
      fireEvent.click(screen.getAllByRole("button", { name: "Can't make it" }).at(-1)!);

      expect(await screen.findByText("You declined this hike")).toBeInTheDocument();
    });

    it("redirects an expired session without losing or sending the draft", async () => {
      hasActiveSession.mockResolvedValue(false);
      setup();
      const input = screen.getByLabelText("Message");
      fireEvent.change(input, { target: { value: "Not sent" } });
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
      await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
      expect(input).toHaveValue("Not sent");
      expect(screen.queryByText("Not sent")).not.toBeInTheDocument();
    });

    it("retains a draft after session-check failure and permits a retry", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      hasActiveSession.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(true);
      setup();
      const input = screen.getByLabelText("Message");
      fireEvent.change(input, { target: { value: "Retry message" } });
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("Could not complete this action");
      expect(input).toHaveValue("Retry message");
      expect(push).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
      expect(await screen.findByText("Retry message")).toBeInTheDocument();
      await waitFor(() => expect(input).toHaveValue(""));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("prevents duplicate sends while checking the session", async () => {
      let resolve!: (value: boolean) => void;
      hasActiveSession.mockImplementation(() => new Promise<boolean>((r) => { resolve = r; }));
      setup();
      const input = screen.getByLabelText("Message");
      fireEvent.change(input, { target: { value: "One message" } });
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
      expect(input).toBeDisabled();
      expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
      await act(async () => { resolve(true); });
      expect(await screen.findByText("One message")).toBeInTheDocument();
      expect(hasActiveSession).toHaveBeenCalledTimes(1);
    });
  });

  it("toggles follow in the conversation header", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Unfollow Priya Nair" }));
    expect(await screen.findByRole("button", { name: "Follow Priya Nair" })).toHaveAttribute("aria-pressed", "false");
  });

  it("redirects an expired session when following from a conversation", async () => {
    hasActiveSession.mockResolvedValue(false);
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Unfollow Priya Nair" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
    expect(screen.getByRole("button", { name: "Unfollow Priya Nair" })).toHaveAttribute("aria-pressed", "true");
  });

  it.each(["Share a trail", "Propose a hike", "I'm in"])(
    "redirects an expired session before the %s chat action",
    async (label) => {
      hasActiveSession.mockResolvedValue(false);
      setup();
      const beforeLinks = screen.getAllByRole("link", { name: /View trail/ }).length;
      const beforeProposals = screen.getAllByText("HIKE PROPOSAL").length;
      fireEvent.click(screen.getByRole("button", { name: label }));
      await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
      expect(screen.getAllByRole("link", { name: /View trail/ })).toHaveLength(beforeLinks);
      expect(screen.getAllByText("HIKE PROPOSAL")).toHaveLength(beforeProposals);
      expect(screen.queryByText("You're going")).not.toBeInTheDocument();
    },
  );

  it.each(["Accept", "Delete", "Block"])(
    "redirects an expired session before %s changes a request",
    async (label) => {
      hasActiveSession.mockResolvedValue(false);
      setup();
      fireEvent.click(screen.getByRole("tab", { name: /Requests/ }));
      fireEvent.click(screen.getByRole("button", { name: label }));
      await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
      expect(screen.getByRole("heading", { name: "Sofia Marchetti" })).toBeInTheDocument();
      expect(screen.getByLabelText("2 pending")).toBeInTheDocument();
    },
  );

  it("goes back to the list on mobile", () => {
    setup();
    fireEvent.click(within(list()).getByRole("button", { name: /Lucas Torres/ }));
    fireEvent.click(screen.getByRole("button", { name: "Back to chats" }));
    expect(list()).toHaveClass("flex");
  });

  it("shows the empty state with suggestions when there are no chats", async () => {
    setup([]);

    expect(screen.getByText("No chats yet")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Find someone to hike with" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse trails" })).toHaveAttribute("href", "/");

    expect(screen.getAllByRole("link", { name: "View profile" })[0])
      .toHaveAttribute("href", `/profile/${SUGGESTED_HIKERS[0].person.id}`);
  });
});
