import "@fontsource-variable/orbitron";
import { createContext, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { JumpLink } from "@/components/hyperspace";
import * as ART from "./art";
import { Ill, type IllName } from "./ill";
import { useJumpers } from "./jumpers";
import { Box, chamfer, chamferAll, Corners, display, DUNE, IGNITION, INK, LINE, MIST, ORBITRON, PATTERN, Row, TagStrip } from "./parts";
import {
  StartupTile, StartupTileSkeleton, startupGrid, type Startup,
} from "./people";
import { bandHeight, CrewCard, Pit, PIT_H, STATIONS, useCrewPhotos } from "./crew";
import { shipTopFor, StopDetails, StopList, TOUR_WHY, TourMap, useSelectedStop, useTour } from "./tour";
import { BENTO_H, TimelineBento, TOUR_ANCHOR } from "./timeline";
import { VestingRuler } from "./vesting";
import { Arrival } from "./arrival";

/*
 * Landing sections below the banner, from Figma "Landing / Desktop 1440 · v5 dispatch replica (exact)".
 * Each section sits at a y inside the middle block; children use frame x and y relative to the section's
 * top, so numbers can be checked against the Figma frame. Sections are stacked 80px apart.
 */

const INK80 = "rgba(31,31,31,0.8)", INK66 = "rgba(31,31,31,0.66)", INK25 = "rgba(31,31,31,0.25)";
const SOFT = "rgba(70,70,70,0.14)", FAINT = "rgba(46,46,46,0.1)";
const GAP = 80;

const FAQ_LIST_H = 600; // two columns of five; room for the longest answer open
const FAQ_H = 212 + FAQ_LIST_H + 36;

/** Section order; `rules` are extra full-width lines inside a section (its own 40px gaps). */
const BLOCKS = [
  { id: "who", label: "it’s for you if…", rules: [924, 1004] },
  { id: "get", label: "what you get", rules: [] },
  { id: "crew", label: "pit crew", rules: [] },
  { id: "past", label: "past jumpers", rules: [] },
  { id: "timeline", label: "timeline", rules: [] }, // its rules follow the bento (Middle)
  { id: "conditions", label: "conditions", rules: [] },
  { id: "faq", label: "faq", rules: [] },
] as const;
type BlockId = (typeof BLOCKS)[number]["id"];

// The pit crew and past jumpers grids grow with their data; until it loads, assume jump 001's numbers.
const STARTUPS_FALLBACK = 8;
// Timeline: the bento (timeline.tsx), then the scouting tour map card 80px below it.
const TOUR_H = 839;
// Pit crew: header, the pit schematic, then one band per station (heights are fixed by the station data).
const PIT_Y = 284, BANDS_Y = PIT_Y + PIT_H + 40;
const BAND_YS = STATIONS.reduce<number[]>((acc, s, i) => [...acc, i === 0 ? BANDS_Y : acc[i - 1]! + bandHeight(STATIONS[i - 1]!.crew.length)], []);
const CREW_H = BAND_YS[BAND_YS.length - 1]! + bandHeight(STATIONS[STATIONS.length - 1]!.crew.length) + 36;
const STARTUPS_GRID_Y = 112;
const pastHeight = (n: number) => STARTUPS_GRID_Y + startupGrid(n).h + 36;

/** Section tops inside the middle block. */
const TopsCtx = createContext<Record<BlockId, number> | null>(null);

// ── primitives ──────────────────────────────────────────────────────────────
function Section({ id, h, children }: { id: BlockId; h: number; children: ReactNode }) {
  const tops = useContext(TopsCtx)!;
  return <div id={id} className="absolute left-0 w-[1440px] scroll-mt-[60px]" style={{ top: tops[id], height: h }}>{children}</div>;
}

function Panel({ x = 260, y = 0, w = 1140, h, tone = "dune", className, style, children }: { x?: number; y?: number; w?: number; h: number; tone?: "dune" | "mist"; className?: string; style?: CSSProperties; children?: ReactNode }) {
  return (
    <div className={cn("absolute", className)} style={{ left: x, top: y, width: w, height: h, background: tone === "dune" ? DUNE : MIST, clipPath: chamferAll(16), ...style }}>
      {children}
    </div>
  );
}

function Title({ x = 332, y = 136, w = 640, children }: { x?: number; y?: number; w?: number; children: ReactNode }) {
  return <Box x={x} y={y} w={w} as="h2" className={cn(display, "text-[40px] leading-[48px] tracking-[-0.03em] text-[#1f1f1f]")}>{children}</Box>;
}

/** Sub-heading with a hatch running to the content edge. */
function Subhead({ y, children }: { y: number; children: ReactNode }) {
  return (
    <Box x={296} y={y} w={1068} className="flex h-[30px] items-center gap-[38px]">
      <span className={cn(display, "shrink-0 text-[24px] leading-[30px] tracking-[-0.03em] text-[#1f1f1f]")}>{children}</span>
      <span className="h-[15px] flex-1 opacity-45" style={{ backgroundImage: PATTERN.hatch(INK) }} />
    </Box>
  );
}

function Hairline({ x, y, w, h = 1 }: { x: number; y: number; w: number; h?: number }) {
  return <div aria-hidden className="absolute" style={{ left: x, top: y, width: w, height: h, background: SOFT }} />;
}

function Index({ right, y, children }: { right: number; y: number; children: ReactNode }) {
  return <span className="absolute text-[13px] leading-[21px] font-normal" style={{ right: 1440 - right, top: y, color: INK25 }}>{children}</span>;
}

/** Hatched square with corner brackets and an illustration centred in it. */
function ArtSquare({ x, y, size, name, w, h }: { x: number; y: number; size: number; name: IllName; w: number; h: number }) {
  return (
    <Box x={x} y={y} w={size} h={size} style={{ background: DUNE }}>
      <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: PATTERN.hatchBack(INK) }} />
      <Corners color={INK} />
      <Ill name={name} w={w} h={h} style={{ left: (size - w) / 2, top: (size - h) / 2 }} />
    </Box>
  );
}

function Button({ x, y, w, h = 45, dark = false, children, to = "/sign-in", href }: { x: number; y: number; w: number; h?: number; dark?: boolean; children: ReactNode; to?: string; href?: string }) {
  const cls = cn("absolute flex items-center justify-center text-[13px] leading-[21px] font-medium opacity-90 transition-opacity hover:opacity-100", dark ? "text-[#f5f3f0]" : "text-[#1f1f1f]/80");
  const style: CSSProperties = { left: x, top: y, width: w, height: h, background: dark ? "#262626" : MIST, clipPath: chamfer(16) };
  return href ? <a href={href} className={cls} style={style}>{children}</a> : <JumpLink to={to} className={cls} style={style}>{children}</JumpLink>;
}

function Check({ x, y, size = 32 }: { x: number; y: number; size?: number }) {
  return (
    <span aria-hidden className="absolute flex items-center justify-center rounded-full bg-[#262626]" style={{ left: x, top: y, width: size, height: size }}>
      <svg viewBox="0 0 14 14" width={14} height={14}><path d="M3 7.4l2.6 2.6 5.4-5.6" stroke={DUNE} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </span>
  );
}

export function Star({ r, color, className }: { r: number; color: string; className?: string }) {
  const k = r * 0.12;
  return <path d={`M0 ${-r}C${k} ${-k} ${k} ${-k} ${r} 0C${k} ${k} ${k} ${k} 0 ${r}C${-k} ${k} ${-k} ${k} ${-r} 0C${-k} ${-k} ${-k} ${-k} 0 ${-r}Z`} fill={color} className={className} />;
}

// ── middle block ────────────────────────────────────────────────────────────
export function Middle({ shipUrl, shipTone }: { shipUrl: string; shipTone?: number }) {
  const line = { borderColor: LINE } as const;
  const jumpers = useJumpers();
  const startups = useMemo(() => jumpers.data ?? [], [jumpers.data]);
  const startupCount = jumpers.data ? startups.length : jumpers.isError ? 0 : STARTUPS_FALLBACK;
  const [bentoH, setBentoH] = useState(BENTO_H);

  const heights: Record<BlockId, number> = { who: WHO_H, get: 1041, crew: CREW_H, past: pastHeight(startupCount), timeline: bentoH + GAP + TOUR_H, conditions: 760, faq: FAQ_H };
  const tops = {} as Record<BlockId, number>;
  let y = GAP;
  for (const b of BLOCKS) { tops[b.id] = y; y += heights[b.id] + GAP; }
  const middleH = y; // after the last section, the same 80px gap before the footer
  const rules = [...BLOCKS.flatMap((b) => [tops[b.id], tops[b.id] + heights[b.id] - 1, ...b.rules.map((r) => tops[b.id] + r)]), tops.timeline + bentoH, tops.timeline + bentoH + GAP];

  return (
    <TopsCtx.Provider value={tops}>
      <Row height={middleH} backdrop={rules.map((y) => <div key={y} className="absolute inset-x-0 h-px" style={{ top: y, background: LINE }} />)}>
        <Box x={40} y={0} w={180} h={middleH} className="border-x" style={line}>
          <SideNav />
        </Box>
        <Box x={260} y={0} w={1140} h={middleH} className="pointer-events-none border-x" style={line} />
        <WhoFor />
        <WhatYouGet />
        <PitCrew shipUrl={shipUrl} shipTone={shipTone} />
        <PastJumpers h={heights.past} startups={startups} pending={jumpers.isPending} count={startupCount} />
        <Timeline shipUrl={shipUrl} bentoH={bentoH} onBento={setBentoH} />
        <Conditions />
        <Faq />
      </Row>
    </TopsCtx.Provider>
  );
}

/** Sticky section index in the left rail; the rule under each item fills as you pass it. */
function SideNav() {
  const [active, setActive] = useState(-1);
  useEffect(() => {
    const onScroll = () => {
      let a = -1;
      BLOCKS.forEach((s, i) => { const el = document.getElementById(s.id); if (el && el.getBoundingClientRect().top < window.innerHeight * 0.45) a = i; });
      setActive(a);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav aria-label="Sections" className="sticky top-[60px] bg-[#262626]">
      <div className="h-[81px] border-b" style={{ borderColor: LINE }} />
      {BLOCKS.map((s, i) => (
        <a key={s.id} href={`#${s.id}`} className="group relative flex h-[38px] items-center gap-3 px-2 text-[13px] leading-[21px]">
          <span className="w-4 text-[#bbbbb5]/65">{String(i + 1).padStart(2, "0")}</span>
          <span className={cn("transition-colors", i === active ? "text-[#f5f3f0]" : "text-[#bbbbb5] group-hover:text-[#f5f3f0]")}>{s.label}</span>
          <span className="absolute inset-x-0 bottom-0 h-px" style={{ background: LINE }} />
          <span className="absolute inset-x-0 bottom-0 h-px origin-left transition-transform duration-500" style={{ background: "rgba(187,187,181,0.66)", transform: `scaleX(${i <= active ? 1 : 0})` }} />
        </a>
      ))}
    </nav>
  );
}

// ── 01 it's for you if… ─────────────────────────────────────────────────────
export const HAVE = [
  { title: "olympiads & hackathons", body: "a medal, an award (or a near miss) at a national or international olympiad in math, informatics, physics, ai or robotics.", art: ["olympiads", 115, 175] },
  { title: "prototypes", body: "something real you built before 16: a game, a robot, an open-source project, a tool people actually used.", art: ["prototypes", 190, 110] },
  { title: "technical depth", body: "a habit of going three levels deeper than everyone else, trying to solve hard problems.", art: ["depth", 110, 177] },
] as const;
export const TRAITS: { word: string; body: string; icon: readonly [IllName, number, number]; link?: { label: string; href: string } }[] = [
  { word: "curiosity", body: "you look for details others just gloss over.", icon: ["curiosity", 115, 104] },
  { word: "high agency", body: "you don’t wait for permission.", icon: ["agency", 62, 99], link: { label: "What is High Agency?", href: "https://www.highagency.com/" } },
  { word: "intelligence", body: "you learn fast, and it shows in what you build.", icon: ["intelligence", 96, 96] },
];
const COL_X = [260, 640, 1021];

const WHO_T = 1004; // traits panel top: 80px below the cards
const WHO_H = WHO_T + 494;

function WhoFor() {
  const T = WHO_T;
  const CELL = (1068 - 4 * 8) / 3;
  const ICON = 1.4; // trait icons drawn larger than their 1x Figma exports
  return (
    <Section id="who" h={WHO_H}>
      <Panel h={413} />
      <TagStrip x={296} y={36} w={1068} label="it’s for you if…" dark solid />
      <Title x={296} w={700}>you’re under 26, technical, and you’ve been building things for longer than you’ve been allowed to vote.</Title>
      <Box x={296} y={282} as="p" className="text-[20px] leading-7" style={{ color: INK80 }}>you can apply with or without an idea.</Box>
      <Subhead y={350}>you probably have one or more of these:</Subhead>

      {HAVE.map((c, i) => {
        const x = COL_X[i]!;
        return (
          <div key={c.title}>
            <Panel x={x} y={414} w={379} h={511} />
            <Box x={x + 36} y={450} as="p" className={cn(display, "text-[20px] leading-[27px] text-[#1f1f1f]")}>{c.title}</Box>
            <Index right={x + 379 - 36} y={450}>{String(i + 1).padStart(3, "0")}</Index>
            <ArtSquare x={x + 36} y={501} size={307} name={c.art[0]} w={c.art[1]} h={c.art[2]} />
            <Box x={x + 36} y={823} w={307} as="p" className="text-[15px] leading-6 text-[#1f1f1f]">{c.body}</Box>
          </div>
        );
      })}

      <Panel y={T} h={494} />
      <Subhead y={T + 33}>we care about three things:</Subhead>
      <Box x={296} y={T + 133} w={1068} h={325} style={{ background: MIST }}>
        <div className="absolute inset-0 opacity-35" style={{ backgroundImage: PATTERN.hatchBack(INK) }} />
        {TRAITS.map((t, i) => (
          <div key={t.word} className="absolute h-[309px]" style={{ left: 8 + i * (CELL + 8), top: 8, width: CELL, background: DUNE }}>
            <Ill name={t.icon[0]} w={Math.round(t.icon[1] * ICON)} h={Math.round(t.icon[2] * ICON)} style={{ left: 28, top: 28 }} />
            <p className={cn(display, "absolute left-7 top-[203px] text-[24px] leading-[30px] tracking-[-0.03em] text-[#1f1f1f]")}>{t.word}</p>
            <p className="absolute inset-x-7 top-[239px] text-[13px] leading-[21px] text-balance" style={{ color: INK80 }}>{t.body}</p>
            {t.link && (
              <a href={t.link.href} target="_blank" rel="noopener noreferrer" className="absolute left-7 top-[268px] text-[13px] leading-[21px] text-[#1f1f1f] underline decoration-[#1f1f1f]/35 underline-offset-4 transition-colors hover:decoration-[#1f1f1f]">
                {t.link.label}
              </a>
            )}
          </div>
        ))}
      </Box>
    </Section>
  );
}

// ── 02 timeline ─────────────────────────────────────────────────────────────
function Timeline({ shipUrl, bentoH, onBento }: { shipUrl: string; bentoH: number; onBento: (h: number) => void }) {
  const M = bentoH + GAP; // scouting tour card top
  const tour = useTour();
  const [selected, setSelected] = useSelectedStop(tour);
  return (
    <Section id="timeline" h={M + TOUR_H}>
      <TimelineBento onHeight={onBento} />
      <div id={TOUR_ANCHOR} className="absolute scroll-mt-[60px]" style={{ top: M }} />
      <Panel y={M} h={TOUR_H} />
      <Box x={296} y={M + 36} as="h3" className={cn(display, "text-[32px] leading-[38px] tracking-[-0.03em] text-[#1f1f1f]")}>the scouting tour</Box>
      <Box x={296} y={M + 77} w={640} as="p" className="text-[15px] leading-6" style={{ color: INK80 }}>{TOUR_WHY}</Box>
      <Box x={296} y={M + 166}><TourMap tour={tour} shipSrc={shipTopFor(shipUrl)} selected={selected} onSelect={setSelected} /></Box>
      <Box x={972} y={M + 166} w={392}><StopDetails tour={tour} selected={selected} /></Box>
      <Box x={972} y={M + 500} w={392}><StopList tour={tour} selected={selected} onSelect={setSelected} /></Box>
    </Section>
  );
}

// ── 03 conditions ───────────────────────────────────────────────────────────
// TODO: link the incorporation guide once it's written.
export const GUIDE_HREF = "#";
export const CONDITIONS = [
  { title: "be under 26 when you apply", body: "or at least one of your co-founders is under 26. you can apply while enrolled in university, masters or phd and we don’t expect you to drop out to participate." },
  { title: "apply solo or as a team of up to 3", body: "why limit to 3? in our experience, 4 is one too many and roles become harder to figure out. we believe you can now build massive companies with small, fierce teams." },
  { title: "get approved for a US visa or ESTA", body: "apply for it at the US embassy in your home country. don’t worry, we’ll send you supporting documents for your application." },
  { title: "register a US C-corp", body: "it’s how we invest in your startup, and how future investors will expect you to be set up.", cta: "incorporation guide" },
];

function Conditions() {
  return (
    <Section id="conditions" h={760}>
      <Panel h={760} />
      <TagStrip x={296} y={69} w={1068} label="conditions" dark solid />
      <Title x={305} y={143}>To become a jumper, you need to:</Title>
      {CONDITIONS.map((c, i) => {
        const y = 224 + i * 132;
        return (
          <div key={c.title}>
            <Hairline x={296} y={y} w={1068} />
            <Check x={296} y={y + 36} />
            <Box x={368} y={y + 34} w={420} as="h3" className={cn(display, "text-[28px] leading-[35px] tracking-[-0.03em] text-[#1f1f1f]")}>{c.title}</Box>
            <Box x={836} y={y + 36} w={c.cta ? 310 : 460} as="p" className="text-[15px] leading-6 text-pretty" style={{ color: INK80 }}>{c.body}</Box>
            {c.cta && <Button x={1164} y={y + 36} w={200} dark href={GUIDE_HREF}>{c.cta}</Button>}
          </div>
        );
      })}
    </Section>
  );
}

// ── 04 what you get ─────────────────────────────────────────────────────────
// TODO: links once the agreement and the team page exist.
export const AGREEMENT_HREF = "#", TEAM_HREF = "#";

/** Label + value over a thin rail, as on the old jump 001 tiles. */
function Track({ x, y, w, label, value, fill }: { x: number; y: number; w: number; label: string; value: string; fill: number }) {
  return (
    <Box x={x} y={y} w={w} h={40}>
      <div className="flex justify-between text-[13px] leading-[21px] text-[#262626]">
        <span className="opacity-75">{label}</span><span className="font-medium opacity-75">{value}</span>
      </div>
      <div className="absolute inset-x-0 top-[34px] h-[3px]" style={{ background: SOFT }}>
        <div className="h-full bg-[#1f1f1f]" style={{ width: `${Math.max(fill * 100, 0.4)}%` }} />
      </div>
    </Box>
  );
}

function Ticket({ x, y, to, toLabel, stay, accent }: { x: number; y: number; to: string; toLabel: string; stay: string; accent: string }) {
  const W = 497, H = 134, PX = 343, R = 9;
  const small = "absolute text-[12px] leading-[17px]";
  const big = cn(display, "absolute text-[36px] leading-[44px] tracking-[-0.03em] text-[#1f1f1f]");
  return (
    <Box x={x} y={y} w={W} h={H}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="absolute inset-0" aria-hidden>
        <path d={`M0 0H${PX - R}A${R} ${R} 0 0 0 ${PX + R} 0H${W}V${H}H${PX + R}A${R} ${R} 0 0 0 ${PX - R} ${H}H0Z`} fill={MIST} />
        <path d={`M${PX} ${R + 6}V${H - R - 6}`} stroke={INK} strokeOpacity={0.35} strokeDasharray="3 4" />
        <path d="M127 61H205" stroke={INK} strokeOpacity={0.5} strokeDasharray="3 4" className="hj-flow" />
        <g transform="translate(215 61)"><Star r={8} color={accent} className="hj-star" /></g>
      </svg>
      <span className={small} style={{ left: 24, top: 18, color: INK66 }}>from</span>
      <span className={big} style={{ left: 24, top: 38 }}>home</span>
      <span className={small} style={{ left: 24, top: 88, color: INK66 }}>your city</span>
      <span className={small} style={{ left: 239, top: 18, color: INK66 }}>to</span>
      <span className={big} style={{ left: 239, top: 38 }}>{to}</span>
      <span className={small} style={{ left: 239, top: 88, color: INK66 }}>{toLabel}</span>
      <span className={small} style={{ left: PX + 24, top: 18, color: INK66 }}>stay</span>
      <span className={cn(display, "absolute text-[28px] leading-[35px] tracking-[-0.03em] text-[#1f1f1f]")} style={{ left: PX + 24, top: 42 }}>{stay}</span>
      <span className={small} style={{ left: PX + 24, top: 88, color: INK66 }}>jump 002, dates tbc</span>
    </Box>
  );
}

function WhatYouGet() {
  const C = 192, S = 751; // card rows
  const XS = [260, 831];
  const card = (x: number, y: number, title: string, idx: string) => (
    <>
      <Box x={x + 36} y={y + 36} as="p" className={cn(display, "text-[20px] leading-[27px] text-[#1f1f1f]")}>{title}</Box>
      <Index right={x + 569 - 36} y={y + 36}>{idx}</Index>
    </>
  );
  const big = cn(display, "text-[52px] leading-[62px] tracking-[-0.03em] text-[#1f1f1f]");
  return (
    <Section id="get" h={1041}>
      <Panel h={228} />
      <TagStrip x={297} y={35} w={1068} label="what you get" dark solid />
      <Title x={297} y={128}>Every team we pick receives:</Title>
      <div className="absolute left-[297px] top-[187px] h-[2px] w-[1067px] bg-[#262626]" />
      {XS.map((x) => <Panel key={`c${x}`} x={x} y={C} w={569} h={558} />)}
      {XS.map((x) => <Panel key={`s${x}`} x={x} y={S} w={569} h={290} />)}

      {/* capital */}
      {card(260, C, "capital", "001")}
      <Box x={296} y={C + 87} w={250} as="p" className={big}>$75K<br />for 5%</Box>
      <ArtSquare x={573} y={C + 87} size={220} name="growth" w={170} h={137} />
      <Track x={296} y={C + 335} w={497} label="equity" value="5%" fill={0.05} />
      <Track x={296} y={C + 383} w={497} label="post-money valuation cap" value="$1.5M" fill={1} />
      <Hairline x={296} y={C + 441} w={497} />
      <Box x={296} y={C + 477} w={230} as="p" className="text-[13px] leading-[21px] text-[#1f1f1f]">on a SAFE. standard, founder-friendly, no surprises.</Box>
      <Button x={553} y={C + 477} w={240} dark href={AGREEMENT_HREF}>read the investment agreement</Button>

      {/* pit crew */}
      {card(831, C, "pit crew", "002")}
      <Box x={867} y={C + 87} w={250} as="p" className={big}>
        5%<br />
        <span className="group/vest relative inline-block cursor-help outline-none" tabIndex={0} aria-describedby="vested-tip">
          vested
          <span aria-hidden className="absolute -bottom-0.5 left-0.5 h-0 w-full border-b-[1.5px] border-dashed border-[#1f1f1f]" />
          {/* tooltip: hover or keyboard focus on "vested" */}
          <span id="vested-tip" role="tooltip" className="pointer-events-none invisible absolute left-0 top-[78px] z-10 w-[250px] translate-y-1 bg-[#262626] px-3.5 py-3 text-left font-[family-name:var(--font-sans)] text-[12px] leading-[17px] font-light tracking-normal text-[#f5f3f0] opacity-0 transition-[opacity,transform,visibility] duration-200 ease-out group-hover/vest:visible group-hover/vest:translate-y-0 group-hover/vest:opacity-100 group-focus-visible/vest:visible group-focus-visible/vest:translate-y-0 group-focus-visible/vest:opacity-100">
            <span aria-hidden className="absolute -top-[7px] left-6 h-0 w-0 border-x-[6px] border-b-[7px] border-x-transparent border-b-[#262626]" />
            vesting means the equity is earned over time, not handed over on day one. if we stop showing up, we stop earning it.
          </span>
        </span>
      </Box>
      <ArtSquare x={1144} y={C + 87} size={220} name="profiles" w={170} h={146} />
      <Box x={867} y={C + 335} w={497}><VestingRuler /></Box>
      <Hairline x={867} y={C + 441} w={497} />
      <Box x={867} y={C + 477} w={260} as="p" className="text-[13px] leading-[21px] text-[#1f1f1f]">operators and mentors who work with you, not just advise you.</Box>
      <Button x={1184} y={C + 477} w={180} dark href={TEAM_HREF}>meet the team</Button>

      {/* flights and housing */}
      {card(260, S, "San Francisco", "003")}
      <Ticket x={296} y={S + 84} to="SFO" toLabel="san francisco" stay="1 month" accent={IGNITION} />
      <Box x={296} y={S + 233} w={497} as="p" className="text-[13px] leading-[21px] text-[#1f1f1f]">flights and housing in san francisco, for the full month.</Box>
      {card(831, S, "European kickoff", "004")}
      <Ticket x={867} y={S + 84} to="CEE" toLabel="capital city" stay="2 weeks" accent={INK} />
      <Box x={867} y={S + 233} w={497} as="p" className="text-[13px] leading-[21px] text-[#1f1f1f]">flights and housing in capital city in Central-Eastern Europe, for the full two weeks.</Box>
    </Section>
  );
}

// ── pit crew ────────────────────────────────────────────────────────────────
function PitCrew({ shipUrl, shipTone }: { shipUrl: string; shipTone?: number }) {
  const photos = useCrewPhotos();
  return (
    <Section id="crew" h={CREW_H}>
      <Panel h={CREW_H} />
      <TagStrip x={296} y={36} w={1068} label="pit crew" dark solid />
      <Box x={332} y={136} w={970} as="h2" className={cn(display, "text-[64px] leading-[72px] tracking-[-0.03em] text-[#1f1f1f]")}>Your pit crew, available at all times.</Box>
      <Box x={332} y={220} w={640} as="p" className="text-[20px] leading-6" style={{ color: INK80 }}>founders and operators who work with you, not just advise you.</Box>
      <Box x={296} y={PIT_Y}><Pit model={shipUrl} tone={shipTone} photos={photos} /></Box>
      {STATIONS.map((st, i) => {
        const y = BAND_YS[i]!;
        return (
          <div key={st.key} id={`crew-${st.key}`} className="scroll-mt-[60px]">
            <Hairline x={296} y={y} w={1068} />
            <Box x={296} y={y + 28} w={210}>
              <h3 className={cn(display, "text-[32px] leading-[38px] tracking-[-0.03em] text-[#1f1f1f]")}>{st.name}</h3>
              <p className="mt-2.5 w-[200px] text-[13px] leading-[21px]" style={{ color: INK66 }}>{st.covers}</p>
            </Box>
            <Box x={528} y={y + 24} w={836} className="grid grid-cols-2 gap-2 p-2">
              {st.crew.map((m) => <CrewCard key={m.name} m={m} photos={photos} fixed />)}
            </Box>
          </div>
        );
      })}
    </Section>
  );
}

// ── past jumpers ────────────────────────────────────────────────────────────
/** One tile per startup from jump 001: founder photos first. */
function PastJumpers({ h, startups, pending, count }: { h: number; startups: Startup[]; pending: boolean; count: number }) {
  const grid = startupGrid(count);
  return (
    <Section id="past" h={h}>
      <Panel h={h} />
      <Box x={296} y={45} as="h2" className={cn(display, "text-[24px] leading-[30px] tracking-[-0.03em] text-[#1f1f1f]")}>past jumpers</Box>
      <span className="absolute text-right text-[13px] leading-[21px]" style={{ right: 1440 - 1364, top: 49, color: INK66 }}>15 teams from jump 001, and what they build now.</span>
      <Box x={296} y={STARTUPS_GRID_Y} w={1068} h={grid.h} style={{ background: MIST }} className="overflow-hidden">
        <div aria-hidden className="absolute inset-0 opacity-20" style={{ backgroundImage: PATTERN.hatch(INK) }} />
        {!pending && count === 0 && <p className="absolute inset-0 flex items-center justify-center text-[13px] leading-[21px]" style={{ color: INK80 }}>the past jumpers go up here soon.</p>}
        <div aria-busy={pending || undefined}>
          {grid.cells.map((c, i) => {
            const st = startups[i];
            const style = { position: "absolute", left: c.x, top: c.y } as const;
            return st ? <StartupTile key={st.id} s={st} n={i + 1} style={style} /> : <StartupTileSkeleton key={i} style={style} />;
          })}
        </div>
      </Box>
    </Section>
  );
}

// ── 06 faq ──────────────────────────────────────────────────────────────────
export const FAQS = [
  ["i don’t have an olympiad medal. should i still apply?", "yes. the medal is a signal, not a requirement. if you’ve built something serious, show us."],
  ["i don’t have a company yet. is that a problem?", "no. you need a team (or just you) and something you’re obsessed with building. you’ll incorporate during the prep phase."],
  ["what’s a SAFE?", "a simple agreement for future equity. we give you money now, and it turns into shares when you raise your next round. our $75K for 5% works out to a $1.5M post-money valuation cap."],
  ["what does the pit crew actually do?", "whatever your company needs most: product, engineering, fundraising, hiring, legal setup, intros. they work with you through the program and after it."],
  ["do i have to move to san francisco?", "for one month, yes. after that, build wherever you want."],
  ["can i do this while i’m still at university?", "plenty of our founders are students. you’ll need to be there in person for bucharest and san francisco."],
  ["does it cost anything?", "no application fees, no program fees. flights and housing are on us."],
  ["i’m 25. is that too old?", "if you’re under 26 when you apply, you’re in the running."],
  ["what happens if my startup fails?", "you stay part of the network, you get recommended to some of our other portfolio companies to work for, and we’ll be glad to see what you build next."],
  ["why “hyperjump”?", "because some founders don’t grow linearly, but exponentially. for them, it’s like coming out of hyperspace at the right time, in the right place."],
];

function Faq() {
  const [open, setOpen] = useState(0);
  const item = (i: number) => {
    const [q, a] = FAQS[i]!;
    const isOpen = open === i;
    return (
      <div key={q} style={{ background: DUNE }}>
        <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? -1 : i)} className={cn("flex w-full items-start justify-between gap-6 px-7 pt-8 text-left transition-[padding] duration-300", isOpen ? "pb-6" : "pb-[33px]")}>
          <span className={cn(display, "text-[16px] leading-6 text-[#1f1f1f]")}>{q}</span>
          <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full transition-colors", isOpen ? "bg-[#262626]" : "bg-[#e0dedb]")}>
            <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
              <path d="M2 6h8" stroke={isOpen ? DUNE : INK} strokeWidth={1.4} strokeLinecap="round" />
              <path d="M6 2v8" stroke={INK} strokeWidth={1.4} strokeLinecap="round" className={cn("origin-center transition-transform duration-300", isOpen && "scale-y-0")} />
            </svg>
          </span>
        </button>
        <div className={cn("grid transition-[grid-template-rows] duration-300 ease-out", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
          <div className="min-h-0 overflow-hidden"><p className="px-7 pb-[53px] text-[13px] leading-[21px]" style={{ color: INK80 }}>{a}</p></div>
        </div>
      </div>
    );
  };
  return (
    <Section id="faq" h={FAQ_H}>
      <Panel h={FAQ_H} />
      <TagStrip x={296} y={36} w={1068} label="faq" dark />
      <Box x={296} y={116} as="h2" className={cn(display, "text-[40px] leading-[48px] tracking-[-0.03em] text-[#1f1f1f]")}>Frequently Asked Questions</Box>
      <span className="absolute top-[128px] text-[13px] leading-[21px] text-[#1f1f1f]" style={{ right: 1440 - 1203 }}>still have questions? ask the team.</span>
      <Button x={1227} y={116} w={137} href={CONTACT_HREF}>contact us</Button>
      <Box x={296} y={212} w={1068} h={FAQ_LIST_H} style={{ background: MIST }}>
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: PATTERN.hatch("#2e2e2e") }} />
        <div className="relative grid grid-cols-2 items-start gap-2 p-2">
          <div className="flex flex-col gap-2">{[0, 1, 2, 3, 4].map(item)}</div>
          <div className="flex flex-col gap-2">{[5, 6, 7, 8, 9].map(item)}</div>
        </div>
      </Box>
    </Section>
  );
}

// ── footer ──────────────────────────────────────────────────────────────────
export const PAGES = [["it’s for you if", "#who"], ["timeline", "#timeline"], ["conditions", "#conditions"], ["what you get", "#get"], ["past jumpers", "#past"], ["faq", "#faq"]];
// TODO: real profile URLs, contact address and exponential's site (not confirmed yet).
export const CONTACT_HREF = "#";
export const ELSEWHERE = [["linkedin", "#"], ["instagram", "#"], ["email", CONTACT_HREF], ["exponential", "#"]];

function LinkList({ x, title, items }: { x: number; title: string; items: string[][] }) {
  return (
    <>
      <Box x={x} y={301} className={cn(display, "text-[16px] leading-6 text-[#f5f3f0]")}>{title}</Box>
      {items.map(([label, to], k) => (
        <div key={label}>
          {to!.startsWith("/") ? (
            <a href={to!} className={cn(display, "absolute text-[16px] leading-6 transition-colors hover:text-[#f5f3f0]", k === 0 ? "text-[#f5f3f0]" : "text-[#bbbbb5]")} style={{ left: x, top: 349 + k * 41 }}>{label}</a>
          ) : (
            <a href={to} className={cn(display, "absolute text-[16px] leading-6 transition-colors hover:text-[#f5f3f0]", k === 0 ? "text-[#f5f3f0]" : "text-[#bbbbb5]")} style={{ left: x, top: 349 + k * 41 }}>{label}</a>
          )}
          <div className="absolute h-px w-[203px]" style={{ left: x, top: 381 + k * 41, background: LINE }} />
        </div>
      ))}
    </>
  );
}

export function Footer({ shipUrl, shipTone }: { shipUrl: string; shipTone?: number }) {
  const line = { borderColor: LINE } as const;
  return (
    <Row
      height={1179}
      className="bg-[#1f1f1f]"
      backdrop={[80, 614, 654, 1099].map((y) => <div key={y} className="absolute inset-x-0 h-px" style={{ top: y, background: LINE }} />)}
    >
      {/* frame */}
      <Box x={40} y={0} w={180} h={614} className="border-x" style={line} />
      <Box x={260} y={0} w={1140} h={614} className="border-x" style={line} />
      <Box x={810} y={0} w={40} h={80} className="border-x" style={line} />
      <Box x={40} y={614} w={1360} h={40} className="border-x" style={line} />
      <Box x={810} y={614} w={40} h={40} className="border-x" style={line} />
      <Box x={40} y={1099} w={1360} h={80} className="border-x" style={line} />

      <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="absolute left-[65px] top-[90px] flex items-center gap-[20px] text-[13px] leading-[21px] font-normal text-[#bbbbb5] hover:text-[#f5f3f0]">
        <span aria-hidden className="block size-[21px] opacity-50" dangerouslySetInnerHTML={{ __html: ART.backTop }} />back to top
      </button>

      {/* CTA */}
      <TagStrip x={296} y={120} w={478} label="jump 002 is open" />
      <Box x={296} y={196} w={530} as="h2" className={cn(display, "text-[48px] leading-[67.2px] tracking-[-0.035em]")}>
        <span className="text-[#f5f3f0]">Reach escape velocity. </span><span className="text-[#bbbbb5]">apply today.</span>
      </Box>
      <Box x={296} y={355} w={478} as="p" className="text-[15px] leading-6">$75K investment, a pit crew that works with you, two weeks in cee and a month in San Francisco. flights and housing included.</Box>
      <JumpLink to="/sign-in" className="absolute left-[296px] top-[525px] flex h-[53px] w-[478px] items-center justify-center text-[15px] leading-[21px] font-semibold text-[#1f1f1f] opacity-90 transition-opacity hover:opacity-100" style={{ background: MIST, clipPath: chamfer(16), ...ORBITRON }}>apply to jump 02</JumpLink>

      {/* ring vortex over the dot screen */}
      <Box x={850} y={80} w={550} h={185} className="overflow-hidden border-l" style={line}>
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: PATTERN.dots(MIST) }} />
        <Ill name="vortex" w={292} h={152} style={{ left: 17, top: 17 }} />
      </Box>
      <Box x={850} y={265} w={550} h={349} className="border-l border-t" style={line} />
      <Box x={1125} y={265} w={275} h={349} className="border-l" style={line} />
      <LinkList x={886} title="pages" items={PAGES} />
      <LinkList x={1161} title="elsewhere" items={ELSEWHERE} />

      {/* ignition band */}
      <div className="absolute left-10 top-[654px] h-[445px] w-[180px]" style={{ background: "#5636e0", clipPath: chamferAll(16) }}>
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: PATTERN.hatch("#1c1c1c") }} />
        <img src="/landing/el/hj-mark.svg" alt="" width={89} height={130} className="absolute left-[42px] top-[158px]" />
      </div>
      <div className="absolute left-[220px] top-[654px] h-[445px] w-[1180px] overflow-hidden" style={{ background: IGNITION, clipPath: chamferAll(16) }}>
        <Arrival model={shipUrl} tone={shipTone} x={1000} y={128} size={200} from={1150} trail={690} />
        <p className={cn(display, "absolute left-[74px] top-[259px] text-[28px] leading-[35px] tracking-[-0.03em] text-[#f5f3f0]")}>your chance to build at the frontier.</p>
        <img src="/landing/el/wordmark.svg" alt="" width={1057} height={104} className="absolute left-[76px] top-[305px]" />
        {/* purple halftone over the lower half of the wordmark */}
        <img src="/landing/el/wordmark-halftone.png" alt="" width={1140} height={306} className="absolute left-10 top-[139px]" />
      </div>

      {/* bottom bar */}
      <Box x={73} y={1129} className="text-[13px] leading-[21px] text-[#f5f3f0]">© hyperjump 2026</Box>
      <div className="absolute left-[220px] top-[1132px] h-[15px] w-[570px] opacity-25" style={{ backgroundImage: PATTERN.plus(MIST) }} />
      <Box x={830} y={1128} className="flex gap-10 text-[13px] leading-[21px]">
        <span className="text-[#f5f3f0]">all rights reserved</span>
        <a href="#" className="text-[#bbbbb5] hover:text-[#f5f3f0]">terms of use</a>
        <a href="#" className="text-[#bbbbb5] hover:text-[#f5f3f0]">privacy policy</a>
      </Box>
      <div className="absolute left-[1235px] top-[1132px] h-[15px] w-[101px] opacity-25" style={{ backgroundImage: PATTERN.plus(MIST) }} />
      <img src="/landing/el/hj-mark-white.svg" alt="" width={26} height={37} className="absolute left-[1353px] top-[1120px]" />
    </Row>
  );
}
