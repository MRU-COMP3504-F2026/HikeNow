import { Suspense } from "react";
import { getCurrentUser } from "@/app/lib/session";
import Navbar from "./navbar";

async function CurrentNavbar() {
  return <Navbar user={await getCurrentUser()} />;
}

export default function SessionNavbar() {
  return (
    <Suspense fallback={<Navbar />}>
      <CurrentNavbar />
    </Suspense>
  );
}
