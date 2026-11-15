import { useSyncExternalStore } from "react";

/*
 * The visitor's answer to the cookie banner: "granted", "denied", or null (not asked yet, or asked more
 * than a year ago). Kept in localStorage under hj-consent; storing the answer itself needs no consent.
 * PostHog (lib/posthog.ts) only starts once this is "granted".
 */

export type Consent = "granted" | "denied" | null;

const KEY = "hj-consent";
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000; // ask again after a year

function read(): Consent {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as { choice?: string; at?: number } | null;
    if (v && (v.choice === "granted" || v.choice === "denied") && typeof v.at === "number" && Date.now() - v.at < MAX_AGE_MS) return v.choice;
  } catch { /* storage blocked or malformed: ask */ }
  return null;
}

let current: Consent = typeof window === "undefined" ? null : read();

// the old ship rotation kept "hj-ship" in localStorage without asking: remove it for returning visitors
try { localStorage.removeItem("hj-ship"); } catch { /* storage blocked */ }
let reopened = false; // "cookie settings" in the footer
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const getConsent = () => current;

export function setConsent(choice: "granted" | "denied") {
  current = choice;
  reopened = false;
  try { localStorage.setItem(KEY, JSON.stringify({ choice, at: Date.now() })); } catch { /* remembered for this visit only */ }
  emit();
}

/** Opens the banner again, so the visitor can change their answer. */
export function openConsentSettings() {
  reopened = true;
  emit();
}

export function onConsentChange(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** For the banner: the current answer, and whether to show it. */
export function useConsent() {
  const snap = useSyncExternalStore(onConsentChange, () => `${current}|${reopened}`, () => "null|false");
  const [choice, again] = snap.split("|");
  return { consent: (choice === "null" ? null : choice) as Consent, show: choice === "null" || again === "true" };
}
