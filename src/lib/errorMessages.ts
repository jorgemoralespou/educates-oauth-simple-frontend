import type { LookupErrorCode } from "./educates";

export interface LookupMessage {
  headline: string;
  body: string;
}

export const lookupMessages: Record<LookupErrorCode, LookupMessage> = {
  LOOKUP_UNREACHABLE: {
    headline: "Workshop service is unavailable",
    body: "We can't reach the workshop service right now. This is a temporary issue on our side — please try again in a moment.",
  },
  LOOKUP_AUTH_FAILED: {
    headline: "Workshop service isn't available",
    body: "The workshop service rejected our request. Please contact your workshop organizer.",
  },
  LOOKUP_MISCONFIGURED: {
    headline: "Workshop service isn't available",
    body: "The workshop service isn't configured correctly. Please contact your workshop organizer.",
  },
  WORKSHOP_NOT_FOUND: {
    headline: "Workshop not available",
    body: "This workshop isn't currently published. Please contact your workshop organizer.",
  },
  WORKSHOP_NO_CAPACITY: {
    headline: "No sessions available right now",
    body: "All sessions are in use. Please try again in a few minutes.",
  },
  LOOKUP_UNKNOWN: {
    headline: "Something went wrong",
    body: "We couldn't start your workshop. Please try again, and contact your organizer if this keeps happening.",
  },
};

export function messageFor(code: string): LookupMessage {
  if (code in lookupMessages) {
    return lookupMessages[code as LookupErrorCode];
  }
  return lookupMessages.LOOKUP_UNKNOWN;
}
