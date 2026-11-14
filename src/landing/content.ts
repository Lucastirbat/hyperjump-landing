import type { Tip } from "./ship-scene";

/* Copy shared by the desktop (landing.tsx, sections.tsx) and mobile (mobile.tsx) layouts. */

// Tooltip cards on the ship (desktop) / numbered markers + list (mobile).
export const TIPS: Tip[] = [
  { anchor: "tip-cockpit", dx: -60, dy: -130, title: "You", body: "solo or with a team of max 3." },
  { anchor: "tip-engine", dx: -10, dy: -200, title: "$75K SAFE", body: "Fuel for your next adventure." },
  { anchor: "tip-wing", dx: 24, dy: 120, title: "Pit crew", body: "founders who’ve done it before you, ready to help." },
  { anchor: "tip-nose", dx: 24, dy: 150, title: "San Francisco", body: "Spend 1 month building with us." },
];

export const HERO_TITLE = ["Start lightyears", "ahead of everyone"];
export const HERO_SUB = ["apply and get $75K investment and one month in San Francisco.", "for math, programming, physics, robotics exceptional talent, under 26."];

export const STEPS = ["decide if you go solo or with a team", "fill your application online", "meet us in-person in your home country", "get selected and travel to san francisco"];

// TODO: link "read more" to exponential's page once the URL is confirmed.
export const EXPONENTIAL_HREF = "#";
