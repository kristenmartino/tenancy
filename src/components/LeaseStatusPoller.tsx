"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { getLease } from "@/lib/api";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000; // 10 min hard cap so we don't poll forever

/**
 * Invisible client component. Polls /leases/{id} every few seconds while
 * status is "pending" and calls router.refresh() the moment it changes, so
 * the server component re-fetches and the page renders the now-complete
 * extraction + exceptions without the user having to navigate away.
 */
export function LeaseStatusPoller({
  leaseId,
  currentStatus,
}: {
  leaseId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (currentStatus !== "pending") return;

    const interval = setInterval(async () => {
      if (Date.now() - startedAt.current > POLL_TIMEOUT_MS) {
        clearInterval(interval);
        return;
      }
      try {
        const lease = await getLease(leaseId);
        if (lease.status !== "pending") {
          clearInterval(interval);
          router.refresh();
        }
      } catch {
        // Transient errors — keep polling
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [leaseId, currentStatus, router]);

  return null;
}
