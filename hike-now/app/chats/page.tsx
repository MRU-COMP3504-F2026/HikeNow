import type { Metadata } from "next";
import ChatsView from "../components/chats-view";
import Footer from "../components/footer";
import Navbar from "../components/session-navbar";
import {
  INITIAL_THREADS,
  ME,
  MENTION_OPTIONS,
  SHAREABLE_TRAILS,
  SUGGESTED_HIKERS,
} from "./mock-data";

export const metadata: Metadata = {
  title: "Chats | Hike Now",
};

export default function ChatsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1 px-4 py-10 md:px-16">
        <h1 className="mb-7 w-fit text-title font-semibold text-primary underline decoration-2 underline-offset-2">
          Chats
        </h1>

        <ChatsView
          initialThreads={INITIAL_THREADS}
          shareableTrails={SHAREABLE_TRAILS}
          mentionOptions={MENTION_OPTIONS}
          suggestions={SUGGESTED_HIKERS}
          me={ME}
        />
      </main>

      <Footer />
    </div>
  );
}
