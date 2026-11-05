import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/session";
import AuthScreen from "../components/auth-screen";
import Footer from "../components/footer";
import SessionNavbar from "../components/session-navbar";

export const metadata: Metadata = { title: "Login | Hike Now" };

async function LoginContent() {
  if (await getCurrentUser()) redirect("/");
  return <AuthScreen />;
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SessionNavbar />
      <main className="flex flex-1 items-center justify-center px-4 py-12 md:px-16">
        <Suspense fallback={<p role="status" className="text-text-subtle">Loading login...</p>}>
          <LoginContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
