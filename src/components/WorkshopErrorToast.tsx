"use client";

import { messageFor } from "@/lib/errorMessages";
import type { SupportConfig } from "@/lib/config";

export interface WorkshopError {
  code: string;
  requestId?: string;
  details?: string;
  workshopName: string;
}

interface Props {
  error: WorkshopError;
  support?: SupportConfig;
  onDismiss: () => void;
}

export function WorkshopErrorToast({ error, support, onDismiss }: Props) {
  const msg = messageFor(error.code);
  const supportHref = support?.contactUrl
    ? support.contactUrl
    : support?.contactEmail
      ? `mailto:${support.contactEmail}`
      : null;

  return (
    <div
      role="alertdialog"
      aria-live="polite"
      aria-labelledby="workshop-error-headline"
      data-error-code={error.code}
      className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-md rounded-lg border shadow-xl p-5"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
        color: "var(--text-primary)",
      }}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="text-lg" style={{ color: "var(--error-text)" }}>
          ⚠
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 id="workshop-error-headline" className="font-semibold">
              {msg.headline}
            </h3>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Close"
              className="leading-none cursor-pointer"
              style={{ color: "var(--text-muted)" }}
            >
              ✕
            </button>
          </div>
          <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
            {msg.body}
          </p>
          {supportHref && (
            <p className="text-sm mt-3">
              <a
                href={supportHref}
                className="underline"
                style={{ color: "var(--text-secondary)" }}
              >
                Contact organizer
              </a>
            </p>
          )}
          {error.requestId && (
            <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
              Ref: {error.requestId}
            </p>
          )}
          {error.details && (
            <details className="mt-2">
              <summary
                className="text-xs cursor-pointer"
                style={{ color: "var(--text-muted)" }}
              >
                Diagnostic details (admin)
              </summary>
              <pre
                className="text-xs mt-1 whitespace-pre-wrap break-words"
                style={{ color: "var(--text-secondary)" }}
              >
                {error.details}
              </pre>
            </details>
          )}
          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={onDismiss}
              className="text-sm py-1.5 px-4 rounded-md font-medium cursor-pointer btn-primary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
