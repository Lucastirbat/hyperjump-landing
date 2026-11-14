import { useQuery } from "@tanstack/react-query";
import { API_URL } from "@/lib/config";

/*
 * Past jumpers: the platform's showcase (published entries of startups accepted into a jump), one entry
 * per startup, with the one-liner from the admin's Startups list. Public fields only.
 */

export type JumperFounder = {
  name: string;
  /** Short role from the showcase, e.g. "CEO" or "ML Engineer @ Nvidia". */
  headline: string | null;
  countryCode: string | null;
  photoUrl: string | null;
};

export type PastJumper = {
  id: string;
  name: string;
  oneLiner: string | null;
  quote: string | null;
  website: string | null;
  logoUrl: string | null;
  cohort: string;
  founders: JumperFounder[];
};

async function fetchPastJumpers(): Promise<PastJumper[]> {
  const res = await fetch(`${API_URL}/api/public/past-jumpers`);
  if (!res.ok) throw new Error(`past jumpers: ${res.status}`);
  return res.json();
}

export function useJumpers() {
  return useQuery({ queryKey: ["public", "past-jumpers"], queryFn: fetchPastJumpers, staleTime: 5 * 60_000, retry: 1 });
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
