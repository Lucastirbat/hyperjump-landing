import type { Tip } from "./ship-scene";

/* Copy shared by the desktop (landing.tsx, sections.tsx) and mobile (mobile.tsx) layouts. */

// Tooltip cards on the ship (desktop) / numbered markers + list (mobile).
export const TIPS: Tip[] = [
  { anchor: "tip-cockpit", dx: -60, dy: -130, title: "You", body: "solo or with a team of max 3." },
  { anchor: "tip-engine", dx: -10, dy: -200, title: "$75K SAFE", body: "Fuel for your next adventure." },
  { anchor: "tip-wing", dx: 24, dy: 120, title: "Pit crew", body: "founders who’ve done it before you, ready to help." },
  { anchor: "tip-nose", dx: 24, dy: 150, title: "San Francisco", body: "Spend 1 month building with us." },
];

export const STEPS = ["Decide if you go solo or with a team", "Complete your profile online", "Submit your application or meet us in-person", "Get selected and travel to the Proving Grounds"];

// TODO: link "read more" to exponential's page once the URL is confirmed.
export const EXPONENTIAL_HREF = "#";
