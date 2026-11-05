import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  INITIAL_THREADS,
  ME,
  MENTION_OPTIONS,
  SHAREABLE_TRAILS,
  SUGGESTED_HIKERS,
} from "../chats/mock-data";
import type { ChatThread } from "../chats/types";
import ChatsView from "./chats-view";

const { hasActiveSession, push } = vi.hoisted(() => ({ hasActiveSession: vi.fn(), push: vi.fn() }));
vi.mock("@/app/actions/auth", () => ({ hasActiveSession }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
beforeEach(() => {
  vi.resetAllMocks();
  hasActiveSession.mockResolvedValue(true);
});

vi.mock("next/link", () => ({
  default: ({
    children,
    ...props
  }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement>>) => (
    <a {...props}>{children}</a>
  ),
}));

function setup(threads: ChatThread[] = INITIAL_THREADS) {
  return render(
    <ChatsView
      initialThreads={threads}
      shareableTrails={SHAREABLE_TRAILS}
      mentionOptions={MENTION_OPTIONS}
      suggestions={SUGGESTED_HIKERS}
      me={ME}
    />,
  );
}

const list = () => screen.getByRole("complementary", { name: "Conversations" });

describe("ChatsView", () => {
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

  it("switches conversations and clears the unread dot", () => {
    setup();
    expect(within(list()).getByLabelText("Unread")).toBeInTheDocument();

    fireEvent.click(within(list()).getByRole("button", { name: /Lucas Torres/ }));

    expect(screen.getByRole("heading", { name: "Lucas Torres" })).toBeInTheDocument();
    fireEvent.click(within(list()).getByRole("button", { name: /Priya Nair/ }));
    expect(within(list()).queryByLabelText("Unread")).not.toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("button", { name: `Follow ${SUGGESTED_HIKERS[0].person.name}` }));
    expect(
      await screen.findByRole("button", { name: `Unfollow ${SUGGESTED_HIKERS[0].person.name}` }),
    ).toBeInTheDocument();
  });
});
