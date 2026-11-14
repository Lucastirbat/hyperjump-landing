import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { fixText, Photo, useMentors, type Mentor } from "./people";
import { chamferAll, display, DUNE, IGNITION, INK, MIST } from "./parts";
import type { PitLineEls, PitPart } from "./pit-scene";

const PitScene = lazy(() => import("./pit-scene"));

/*
 * Pit crew, from Figma "Section / pit crew": the hero's 3D ship from above with six stations (who helps
 * with what), each line ending on the part of the ship it looks after, then one band per station with every mentor's full profile. Photos and LinkedIn come from
 * the platform's mentor list; the station, role, tags and "how I can help" line come from CREW below.
 */

// ── data ────────────────────────────────────────────────────────────────────
export type CrewMember = {
  /** Must match the mentor's name on the platform (photo and LinkedIn come from there). */
  name: string;
  role: string;
  tags: string[];
  /** One sentence, in the mentor's own words. Hidden until it's written. */
  help?: string;
};
export type Station = {
  key: string;
  name: string;
  covers: string;
  /** Where its label sits in the pit, and the part of the ship its line ends on. */
  side: "left" | "right";
  slot: 0 | 1 | 2;
  part: PitPart;
  crew: CrewMember[];
};

// TODO: confirm with the team. Stations, roles and tags are a first pass read from each mentor's own
// platform bio; "help" lines are for the mentors to write.
export const STATIONS: Station[] = [
  { key: "product", name: "product & strategy", covers: "what to build, who it’s for, how to position it.", side: "right", slot: 0, part: "cockpit", crew: [
    { name: "Uldis Leiterts", role: "VP of Product & Growth, Emotiv. Co-founder, Infogram", tags: ["product", "growth"] },
    { name: "Roberts Bernans", role: "Building BADbrain at BADideas.fund. Ex-CPO, Nordigen", tags: ["product", "fintech"] },
    { name: "Momchil Kyurkchiev", role: "Co-founder, Leanplum (acquired 2022)", tags: ["mobile", "engagement"] },
  ] },
  { key: "engineering", name: "engineering & ai", covers: "architecture, scaling, machine learning.", side: "left", slot: 1, part: "engine", crew: [
    { name: "Peter Tuszynski", role: "CTO, intent", tags: ["machine learning", "iot"] },
    { name: "Lukasz Bolikowski", role: "VP Data Science, BCG X", tags: ["ai/ml", "gen ai"] },
    { name: "Saad Bashir", role: "Ex-Head Corporate Technology, Zillow. Ex-AWS", tags: ["cloud", "transformation"] },
  ] },
  { key: "fundraising", name: "fundraising", covers: "your deck, your first investors, your terms.", side: "left", slot: 0, part: "wing-upper", crew: [
    { name: "Paul Bragiel", role: "Founder of 7 VC funds", tags: ["seed", "series a"] },
    { name: "Ewa Chronowska", role: "Partner, Next Road Ventures. Founder, Vestbee", tags: ["vc", "fundraising"] },
    { name: "Borys Musielak", role: "Founding partner, SMOK Ventures", tags: ["early stage", "vc"] },
  ] },
  { key: "go-to-market", name: "go-to-market", covers: "sales, growth, pricing, your first customers.", side: "right", slot: 1, part: "nose", crew: [
    { name: "Wiktoria Wójcik", role: "Co-founder, inStreamly", tags: ["marketing", "gaming"] },
    { name: "Cristi Dragan", role: "Growth, Weekend Games", tags: ["growth", "experiments"] },
    { name: "Vladislav Pavlov", role: "CEO, Scale SEE", tags: ["sales", "fundraising"] },
  ] },
  { key: "legal", name: "legal & ops", covers: "your US C-corp, contracts, visas, finance.", side: "left", slot: 2, part: "wing-lower", crew: [
    { name: "Andrei Valeanu", role: "Co-founder & COO, Embed", tags: ["law", "operations"] },
    { name: "Andy Toth", role: "Scaled to $100M in the US as an early employee", tags: ["law", "us expansion"] },
  ] },
  { key: "hiring", name: "hiring & team", covers: "first hires, culture, leading people.", side: "right", slot: 2, part: "hull", crew: [
    { name: "Gyorgy Szilagyi", role: "Co-founder, Tresorit", tags: ["team", "scaling"] },
    { name: "Carrie Santos", role: "Ex-CEO, Entrepreneurs’ Organization", tags: ["leadership", "community"] },
  ] },
];

export const HAS_HELP = STATIONS.some((s) => s.crew.some((m) => m.help));
/** Desktop card height: room for the "how I can help" line only once someone has written one. */
export const CARD_H = HAS_HELP ? 184 : 152;

const key = (s: string) => fixText(s).normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();

/** Mentors from the platform, by name, for photos and LinkedIn. */
export function useCrewPhotos() {
  const mentors = useMentors();
  return useMemo(() => new Map((mentors.data ?? []).map((m) => [key(m.fullName), m])), [mentors.data]);
}
const lookup = (photos: Map<string, Mentor>, name: string) => photos.get(key(name));

// ── the pit ─────────────────────────────────────────────────────────────────
export const PIT_W = 1068, PIT_H = 420;
const C = [534, 210] as const;
const labelTop = (s: Station) => 46 + s.slot * 120 + 14;

function useField() {
  return useMemo(() => {
    let seed = 11;
    const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    return Array.from({ length: 150 }, () => { const r = [0.5, 0.6, 0.8, 1][Math.floor(rnd() * 4)]!; return { x: 8 + rnd() * (PIT_W - 16), y: 8 + rnd() * (PIT_H - 16), r, o: 0.08 + rnd() * 0.25 }; });
  }, []);
}

/** Mounts the 3D scene once the pit comes near the screen, and pauses it when it scrolls away. */
function useNearScreen<T extends Element>() {
  const ref = useRef<T>(null);
  const [state, set] = useState({ mounted: false, active: false });
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => set((s) => ({ mounted: s.mounted || !!e?.isIntersecting, active: !!e?.isIntersecting })), { rootMargin: "300px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, state] as const;
}

export function Pit({ model, tone, photos }: { model: string; tone?: number; photos: Map<string, Mentor> }) {
  const field = useField();
  const [box, near] = useNearScreen<HTMLDivElement>();
  const names = useRef<(HTMLSpanElement | null)[]>([]);
  const els = useRef<PitLineEls>({ lines: [], dots: [], rings: [], starts: [] });

  // Each line starts just past its label's name, in pit coordinates (offsets ignore the page's zoom).
  useLayoutEffect(() => {
    const measure = () => {
      els.current.starts = STATIONS.map((s, i) => {
        const n = names.current[i]; const y = labelTop(s) + 14;
        const label = n?.parentElement;
        if (!n || !label) return { x: s.side === "left" ? 290 : 778, y };
        return { x: s.side === "left" ? label.offsetLeft + n.offsetLeft + n.offsetWidth + 14 : label.offsetLeft + n.offsetLeft - 14, y };
      });
    };
    measure();
    void document.fonts?.ready.then(measure);
  }, []);

  return (
    <div ref={box} className="relative" style={{ width: PIT_W, height: PIT_H }}>
      <div aria-hidden className="absolute inset-0" style={{ background: INK, clipPath: chamferAll(16) }} />
      <svg aria-hidden viewBox={`0 0 ${PIT_W} ${PIT_H}`} width={PIT_W} height={PIT_H} className="pointer-events-none absolute inset-0">
        <g fill={DUNE}>{field.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fillOpacity={s.o} />)}</g>
        <g fill="none" stroke={DUNE} strokeOpacity={0.07}>{[120, 170, 220].map((r) => <circle key={r} cx={C[0]} cy={C[1]} r={r} />)}</g>
      </svg>
      {near.mounted && (
        <div className="absolute inset-0 cursor-grab active:cursor-grabbing" style={{ clipPath: chamferAll(16) }}>
          <Suspense fallback={null}>
            <PitScene model={model} tone={tone} stations={STATIONS.map((s) => ({ side: s.side, part: s.part }))} els={els} width={PIT_W} height={PIT_H} active={near.active} />
          </Suspense>
        </div>
      )}
      {/* lines: drawn here, moved every frame by the scene so they stay on the ship's parts */}
      <svg aria-hidden viewBox={`0 0 ${PIT_W} ${PIT_H}`} width={PIT_W} height={PIT_H} className="pointer-events-none absolute inset-0">
        {STATIONS.map((s, i) => (
          <g key={s.key}>
            <polyline ref={(el) => { els.current.lines[i] = el; }} points="" fill="none" stroke={DUNE} strokeOpacity={0.35} />
            <circle ref={(el) => { els.current.rings[i] = el; }} cx={-20} cy={-20} r={6} fill="none" stroke="#9999ff" strokeOpacity={0.7} />
            <circle ref={(el) => { els.current.dots[i] = el; }} cx={-20} cy={-20} r={2.5} fill={IGNITION} />
          </g>
        ))}
      </svg>
      {STATIONS.map((s, i) => (
        <a key={s.key} href={`#crew-${s.key}`} className="group absolute w-[250px]" style={{ left: s.side === "left" ? 32 : 786, top: labelTop(s) }}>
          <span ref={(el) => { names.current[i] = el; }} className={cn(display, "inline-block text-[22px] leading-7 tracking-[-0.02em] text-[#f5f3f0] decoration-[#f5f3f0]/40 underline-offset-4 group-hover:underline")}>{s.name}</span>
          <span className="mt-[6px] flex gap-[2px]">
            {s.crew.map((m) => <Photo key={m.name} src={lookup(photos, m.name)?.photoUrl ?? null} name={m.name} className="size-6" size={9} dither={false} />)}
          </span>
        </a>
      ))}
    </div>
  );
}

// ── profile card ────────────────────────────────────────────────────────────
function Arrow() {
  return <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden><path d="M4.5 11.5L11.5 4.5M11.5 10V4.5H6" stroke="currentColor" strokeWidth={1.3} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

/** One mentor, everything visible. `fixed` = the desktop card size; otherwise it fills its column. */
export function CrewCard({ m, photos, fixed }: { m: CrewMember; photos: Map<string, Mentor>; fixed?: boolean }) {
  const p = lookup(photos, m.name);
  return (
    <article className={cn("flex flex-col p-4", fixed && "w-[406px]")} style={{ background: DUNE, outline: `8px solid ${MIST}`, height: fixed ? CARD_H : undefined }}>
      <div className="flex gap-4">
        <Photo src={p?.photoUrl ?? null} name={m.name} className="size-[120px] shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn(display, "text-[20px] leading-6 tracking-[-0.02em] text-[#1f1f1f]")}>{m.name}</h4>
            {p?.linkedinUrl && (
              <a href={p.linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label={`${m.name} on LinkedIn`} className="mt-0.5 shrink-0 text-[#1f1f1f] opacity-80 transition-opacity hover:opacity-100"><Arrow /></a>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-[13px] leading-[18px] text-[#1f1f1f]/66">{m.role}</p>
          <ul className="mt-3 flex flex-wrap gap-1" aria-label="good at">
            {m.tags.map((t) => <li key={t} className="px-2 py-[3px] text-[11px] leading-[15px] font-normal text-[#1f1f1f]/80" style={{ background: MIST }}>{t}</li>)}
          </ul>
        </div>
      </div>
      {m.help && (
        <>
          <span aria-hidden className="mt-3 h-px w-full bg-[#1f1f1f]/10" />
          <p className="mt-2 text-[13px] leading-[18px] text-[#1f1f1f]"><span className="text-[#1f1f1f]/50">how I can help: </span>{m.help}</p>
        </>
      )}
    </article>
  );
}

/** Desktop band height for a station: two cards per row, 8px apart, framed. */
export const bandHeight = (n: number) => 24 + 8 + Math.ceil(n / 2) * (CARD_H + 8) + 24;
