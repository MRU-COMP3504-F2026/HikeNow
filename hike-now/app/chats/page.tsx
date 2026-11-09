import type { Metadata } from "next";
import { Suspense } from "react";
import ChatsView from "../components/chats-view";
import Footer from "../components/footer";
import Navbar from "../components/session-navbar";
import { getChatData } from "../actions/chats";

export const metadata: Metadata = {
  title: "Chats | Hike Now",
};

async function ChatsContent({ searchParams }: { searchParams: Promise<{ thread?: string }> }) {
  const [data, params] = await Promise.all([getChatData(), searchParams]);

  return (
    <ChatsView
      key={data.me.id}
      initialThreads={data.threads}
      initialThreadId={params.thread}
      contacts={data.contacts}
      shareableTrails={data.trails}
      suggestions={[]}
      me={data.me}
    />
  );
}

export default function ChatsPage({ searchParams }: { searchParams: Promise<{ thread?: string }> }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1 px-4 py-10 md:px-16">
        <h1 className="mb-7 w-fit text-title font-semibold text-primary underline decoration-2 underline-offset-2">
          Chats
        </h1>

        <Suspense fallback={<p role="status" className="text-text-subtle">Loading chats...</p>}>
          <ChatsContent searchParams={searchParams} />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
