import type { CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { API_URL } from "@/lib/config";
import { initials, type PastJumper } from "./jumpers";
import { display, DUNE, IGNITION, MIST, ORBITRON } from "./parts";

/*
 * People on the landing page: pit crew (mentors) and past jumpers (startups), from Figma components
 * "Landing / Crew tile" and "Landing / Startup tile". Photos are colour with a dither screen over them;
 * on hover a tile goes dark and its photos take a purple tint.
 */

// ── data ────────────────────────────────────────────────────────────────────
export type Mentor = {
  id: string;
  fullName: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  photoUrl: string | null;
  linkedinUrl: string | null;
};

/**
 * Which cohort's mentors to show. The platform only lists a cohort's *active* mentors, and jump 002's
 * aren't active yet, so this shows jump 001's pit crew for now.
 * TODO: switch to jump 002's slug (or drop it to get the platform's current cohort) once they're active.
 */
export const CREW_COHORT = "hj01-2026";

async function fetchMentors(): Promise<Mentor[]> {
  const res = await fetch(`${API_URL}/api/public/mentors?cohort=${encodeURIComponent(CREW_COHORT)}`);
  if (!res.ok) throw new Error(`mentors: ${res.status}`);
  return res.json();
}

export function useMentors() {
  return useQuery({ queryKey: ["public", "mentors", CREW_COHORT], queryFn: fetchMentors, staleTime: 5 * 60_000, retry: 1 });
}

/** Repairs UTF-8 text that was stored as Latin-1 ("WÃ³jcik" → "Wójcik"). Anything else comes back unchanged. */
export function fixText(s: string) {
  if (!/[ÃÄÅÐÑ][\u0080-¿]/.test(s)) return s;
  try {
    const bytes = Uint8Array.from(Array.from(s, (c) => {
      const n = c.charCodeAt(0);
      if (n > 255) throw new Error("not latin-1");
      return n;
    }));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return s;
  }
}

/** One past-jumper startup, as the platform's showcase serves it. */
export type Startup = PastJumper;

/** The archive tag's country: the first founder who has one. */
const countryOf = (s: Startup) => s.founders.find((f) => f.countryCode)?.countryCode ?? null;

/** "jump 01" → "jump 001", the archive-tag spelling. */
export const jumpTag = (cohort: string) => cohort.trim().toLowerCase().replace(/jump\s*0*(\d+)/, (_, n: string) => `jump ${n.padStart(3, "0")}`);

/** "Name, CEO" for a solo founder with a headline; otherwise the team's names. */
const founderLine = (s: Startup) => {
  const [only] = s.founders;
  if (s.founders.length === 1 && only?.headline) return `${only.name}, ${only.headline}`;
  return s.founders.map((f) => f.name).join(", ");
};

const pad2 = (n: number) => String(n).padStart(2, "0");

// ── shared bits ─────────────────────────────────────────────────────────────
/** A colour photo with the dither screen, or initials on mist. The purple tint shows when its tile is hovered. */
export function Photo({ src, name, className, size = 32, dither = true }: { src: string | null; name: string; className?: string; size?: number; dither?: boolean }) {
  return (
    <div className={cn("relative overflow-hidden", className)} style={{ background: MIST }}>
      {src ? (
        <>
          <img src={src} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
          {dither && <span aria-hidden className="hj-dither" />}
        </>
      ) : (
        <span aria-hidden className={cn(display, "absolute inset-0 flex items-center justify-center tracking-[-0.03em]")} style={{ fontSize: size, color: "rgba(31,31,31,0.5)" }}>{initials(name)}</span>
      )}
      <span aria-hidden className="absolute inset-0 opacity-0 mix-blend-color transition-opacity duration-300 group-hover/tile:opacity-100 group-focus-within/tile:opacity-100" style={{ background: IGNITION }} />
    </div>
  );
}

function Arrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width={16} height={16} className={className} aria-hidden>
      <path d="M4.5 11.5L11.5 4.5M11.5 10V4.5H6" stroke="currentColor" strokeWidth={1.3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── past jumpers ────────────────────────────────────────────────────────────
export function StartupTile({ s, n, className, style }: { s: Startup; n: number; className?: string; style?: CSSProperties }) {
  const hoverText = "transition-colors duration-300 group-hover/tile:text-[#f5f3f0] group-focus-within/tile:text-[#f5f3f0]";
  return (
    <article className={cn("group/tile relative h-[400px] w-[257px] shrink-0 overflow-hidden bg-[#f5f3f0] transition-colors duration-300 hover:bg-[#262626] focus-within:bg-[#262626]", className)} style={style}>
      <div className="absolute left-2 top-2 flex h-[200px] w-[241px] gap-[2px]">
        {s.founders.slice(0, 3).map((f, i) => <Photo key={`${f.name}-${i}`} src={f.photoUrl} name={f.name} className="h-full min-w-0 flex-1" />)}
      </div>
      <div className={cn("absolute left-4 top-[222px] flex w-[225px] justify-between text-[10px] leading-[13px] text-[#1f1f1f]/60 group-hover/tile:text-[#f5f3f0]/60 group-focus-within/tile:text-[#f5f3f0]/60", "transition-colors duration-300")} style={ORBITRON}>
        <span>{jumpTag(s.cohort)} // {pad2(n)}</span>
        <span>{countryOf(s)?.toLowerCase()}</span>
      </div>
      <h3 className={cn(display, "absolute left-4 top-[240px] w-[225px] truncate text-[22px] leading-[28px] tracking-[-0.02em] text-[#1f1f1f]", hoverText)}>{s.name}</h3>
      {s.oneLiner && (
        <p className={cn("absolute left-4 top-[274px] line-clamp-3 w-[225px] text-[13px] leading-[21px] text-[#1f1f1f]/80 group-hover/tile:text-[#f5f3f0]/80 group-focus-within/tile:text-[#f5f3f0]/80", s.quote && "group-hover/tile:invisible group-focus-within/tile:invisible", "transition-colors duration-300")}>{s.oneLiner}</p>
      )}
      {s.quote && (
        <blockquote className={cn(display, "invisible absolute left-4 top-[274px] line-clamp-3 w-[225px] text-[15px] leading-[21px] text-[#f5f3f0] group-hover/tile:visible group-focus-within/tile:visible")}>“{s.quote}”</blockquote>
      )}
      <span aria-hidden className="absolute left-4 top-[345px] h-px w-[225px] bg-[rgba(70,70,70,0.2)] transition-colors duration-300 group-hover/tile:bg-[rgba(245,243,240,0.15)] group-focus-within/tile:bg-[rgba(245,243,240,0.15)]" />
      <p className="absolute left-4 top-[357px] line-clamp-2 w-[200px] text-[12px] leading-[18px] text-[#1f1f1f]/66 transition-colors duration-300 group-hover/tile:text-[#f5f3f0]/66 group-focus-within/tile:text-[#f5f3f0]/66">{founderLine(s)}</p>
      {s.website && (
        <a href={s.website} target="_blank" rel="noopener noreferrer" aria-label={`${s.name} website`} className={cn("absolute left-[225px] top-[359px] text-[#1f1f1f]", hoverText)}>
          <Arrow />
        </a>
      )}
    </article>
  );
}

export function StartupTileSkeleton({ style, className }: { style?: CSSProperties; className?: string }) {
  return (
    <div aria-hidden className={cn("relative h-[400px] w-[257px] shrink-0", className)} style={{ background: DUNE, ...style }}>
      <span className="absolute left-2 top-2 h-[200px] w-[241px] animate-pulse" style={{ background: MIST }} />
      <span className="absolute left-4 top-[228px] h-4 w-32 animate-pulse" style={{ background: MIST }} />
      <span className="absolute left-4 top-[262px] h-3 w-48 animate-pulse" style={{ background: MIST }} />
    </div>
  );
}

/** Desktop startups grid: 4 columns of 257×400 tiles, 8px apart. */
export function startupGrid(n: number) {
  const cells = Array.from({ length: n }, (_, i) => ({ x: 8 + (i % 4) * 265, y: 8 + Math.floor(i / 4) * 408 }));
  return { cells, h: Math.max(1, Math.ceil(n / 4)) * 408 + 8 };
}
