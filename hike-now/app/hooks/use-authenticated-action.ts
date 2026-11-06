"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { hasActiveSession } from "@/app/actions/auth";

export function useAuthenticatedAction() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef(false);

  const run = useCallback(async (action: () => void | Promise<void>) => {
    if (pendingRef.current) return false;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      if (!await hasActiveSession()) {
        router.push("/login");
        return false;
      }
      await action();
      return true;
    } catch (err) {
      console.error("Authenticated action failed:", err);
      setError("Could not complete this action. Please try again.");
      return false;
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, [router]);

  return { run, pending, error };
}
