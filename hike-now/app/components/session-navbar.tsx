import { Suspense } from "react";
import { getCurrentUser } from "@/app/lib/session";
import Navbar from "./navbar";

async function CurrentNavbar() {
  const user = await getCurrentUser();
  return <Navbar user={user ? { id: user.id, email: user.email } : null} />;
}

export default function SessionNavbar() {
  return (
    <Suspense fallback={<Navbar />}>
      <CurrentNavbar />
    </Suspense>
  );
}
