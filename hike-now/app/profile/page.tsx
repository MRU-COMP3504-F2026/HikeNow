import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/session";

async function CurrentProfile() {
  const user = await getCurrentUser();
  return redirect(user ? `/profile/${user.id}` : "/login");
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<p role="status" className="p-10 text-text-subtle">Loading your profile...</p>}>
      <CurrentProfile />
    </Suspense>
  );
}
