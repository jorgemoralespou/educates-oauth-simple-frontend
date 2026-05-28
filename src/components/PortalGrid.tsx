"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PortalCard } from "@/components/PortalCard";
import { WorkshopErrorToast, type WorkshopError } from "@/components/WorkshopErrorToast";
import type { PortalItem, SupportConfig } from "@/lib/config";

interface Props {
  portals: PortalItem[];
  isAuthenticated: boolean;
  autoLaunchWorkshop?: string;
  support?: SupportConfig;
}

function loginUrlFor(workshopName: string): string {
  return `/login?returnTo=${encodeURIComponent(`/portal?autoLaunch=${encodeURIComponent(workshopName)}`)}`;
}

export function PortalGrid({
  portals,
  isAuthenticated,
  autoLaunchWorkshop,
  support,
}: Props) {
  const [error, setError] = useState<WorkshopError | null>(null);
  const [loadingWorkshop, setLoadingWorkshop] = useState<string | null>(null);
  const autoLaunched = useRef(false);

  const startWorkshop = useCallback(
    async (workshopName: string) => {
      if (!isAuthenticated) {
        window.location.href = loginUrlFor(workshopName);
        return;
      }

      setError(null);
      setLoadingWorkshop(workshopName);
      try {
        const res = await fetch(
          `/api/workshops/${encodeURIComponent(workshopName)}`,
        );
        let data: {
          sessionActivationUrl?: string;
          error?: { code: string; requestId?: string; details?: string } | string;
        } = {};
        try {
          data = await res.json();
        } catch {
          // fall through
        }

        if (res.ok && data.sessionActivationUrl) {
          window.location.href = data.sessionActivationUrl;
          return;
        }

        const errInfo =
          typeof data.error === "object" && data.error !== null ? data.error : null;
        setError({
          code: errInfo?.code ?? "LOOKUP_UNKNOWN",
          requestId: errInfo?.requestId,
          details: errInfo?.details,
          workshopName,
        });
      } catch {
        setError({ code: "LOOKUP_UNREACHABLE", workshopName });
      } finally {
        setLoadingWorkshop(null);
      }
    },
    [isAuthenticated],
  );

  useEffect(() => {
    if (autoLaunchWorkshop && isAuthenticated && !autoLaunched.current) {
      autoLaunched.current = true;
      startWorkshop(autoLaunchWorkshop);
    }
  }, [autoLaunchWorkshop, isAuthenticated, startWorkshop]);

  const dismiss = useCallback(() => setError(null), []);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {portals.map((portal) => (
          <PortalCard
            key={portal.workshopName}
            title={portal.title}
            description={portal.description}
            workshopName={portal.workshopName}
            loading={loadingWorkshop === portal.workshopName}
            onStart={() => startWorkshop(portal.workshopName)}
          />
        ))}
      </div>
      {error && (
        <WorkshopErrorToast error={error} support={support} onDismiss={dismiss} />
      )}
    </>
  );
}
