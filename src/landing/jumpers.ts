import { useQuery } from "@tanstack/react-query";
import { API_URL } from "@/lib/config";

/* Past jumpers: the platform admin's Startups list (with its edits), one entry per person. */

export type Jumper = {
  id: string;
  name: string;
  role: string | null;
  quote: string | null;
  countryCode: string | null;
  photoUrl: string | null;
  startup: string;
  website: string | null;
  oneLiner: string | null;
  cohort: string;
};

async function fetchJumpers(): Promise<Jumper[]> {
  const res = await fetch(`${API_URL}/api/public/jumpers`);
  if (!res.ok) throw new Error(`jumpers: ${res.status}`);
  return res.json();
}

export function useJumpers() {
  return useQuery({ queryKey: ["public", "jumpers"], queryFn: fetchJumpers, staleTime: 5 * 60_000, retry: 1 });
}

/** "jump 001" style label from the cohort name. */
export const jumpLabel = (cohort: string) => cohort.trim().toLowerCase();

/** What sits under the name: the role at the startup, or just the startup. */
export const roleLine = (j: Jumper) => `${j.role ?? "founder"} at ${j.startup}`;

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
