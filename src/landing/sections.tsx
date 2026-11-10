import "@fontsource-variable/orbitron";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { JumpLink } from "@/components/hyperspace";
import * as ART from "./art";
import { Ill, type IllName } from "./ill";
import { initials, jumpLabel, roleLine, useJumpers, type Jumper } from "./jumpers";
import { Box, chamfer, chamferAll, Corners, display, DUNE, IGNITION, INK, LINE, MIST, ORBITRON, PATTERN, Row, TagStrip } from "./parts";

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

/** Section order and heights; `rules` are extra full-width lines inside a section (its own 40px gaps). */
const BLOCKS = [
  { id: "who", label: "it’s for you if…", h: 1459, rules: [924, 965] },
  { id: "timeline", label: "timeline", h: 1315, rules: [853, 895] },
  { id: "conditions", label: "conditions", h: 760, rules: [] },
  { id: "get", label: "what you get", h: 1041, rules: [] },
  { id: "past", label: "past jumpers", h: 1500, rules: [680, 721] },
  { id: "faq", label: "faq", h: FAQ_H, rules: [] },
] as const;
type BlockId = (typeof BLOCKS)[number]["id"];
const TOPS = BLOCKS.reduce<number[]>((acc, _b, i) => [...acc, i === 0 ? GAP : acc[i - 1]! + BLOCKS[i - 1]!.h + GAP], []);
const top = (id: BlockId) => TOPS[BLOCKS.findIndex((b) => b.id === id)]!;
const MIDDLE_H = TOPS[TOPS.length - 1]! + BLOCKS[BLOCKS.length - 1]!.h + 130;

// ── primitives ──────────────────────────────────────────────────────────────
function Section({ id, h, children }: { id: BlockId; h: number; children: ReactNode }) {
  return <div id={id} className="absolute left-0 w-[1440px] scroll-mt-[60px]" style={{ top: top(id), height: h }}>{children}</div>;
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

function Note({ x = 1064, y = 165, w = 300, children }: { x?: number; y?: number; w?: number; children: ReactNode }) {
  return <Box x={x} y={y} w={w} as="p" className="text-[13px] leading-[21px]" style={{ color: INK80 }}>{children}</Box>;
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
export function Middle() {
  const line = { borderColor: LINE } as const;
  const rules = BLOCKS.flatMap((b, i) => [TOPS[i]!, TOPS[i]! + b.h - 1, ...b.rules.map((r) => TOPS[i]! + r)]);
  return (
    <Row height={MIDDLE_H} backdrop={rules.map((y) => <div key={y} className="absolute inset-x-0 h-px" style={{ top: y, background: LINE }} />)}>
      <Box x={40} y={0} w={180} h={MIDDLE_H} className="border-x" style={line}>
        <SideNav />
      </Box>
      <Box x={260} y={0} w={1140} h={MIDDLE_H} className="pointer-events-none border-x" style={line} />
      <WhoFor />
      <Timeline />
      <Conditions />
      <WhatYouGet />
      <PastJumpers />
      <Faq />
    </Row>
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
  { title: "olympiads", body: "a medal (or a near miss) at a national or international olympiad in math, informatics, physics, ai or robotics.", art: ["olympiads", 115, 175] },
  { title: "prototypes", body: "something real you built before 16: a game, a robot, a tool people actually used, a company that made its first euro.", art: ["prototypes", 190, 110] },
  { title: "technical depth", body: "a habit of going three levels deeper than everyone else, trying to solve hard problems.", art: ["depth", 110, 177] },
] as const;
export const TRAITS = [
  { word: "curiosity", body: "you look for details others just gloss over.", icon: ["curiosity", 115, 104] },
  { word: "high agency", body: "you don’t wait for permission.", icon: ["agency", 62, 99] },
  { word: "intelligence", body: "you learn fast, and it shows in what you build.", icon: ["intelligence", 96, 96] },
] as const;
// TODO: link to the essay on agency once it's published.
export const ESSAY_HREF = "#";
const COL_X = [260, 640, 1021];

function WhoFor() {
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? 0;
  const T = 965; // traits panel top
  return (
    <Section id="who" h={1459}>
      <Panel h={413} />
      <TagStrip x={296} y={36} w={1068} label="it’s for you if…" dark solid />
      <Title w={700}>you’re under 25, technical, and you’ve been building things for longer than you’ve been allowed to vote.</Title>
      <Box x={332} y={287} as="p" className="text-[20px] leading-7" style={{ color: INK80 }}>you can apply with or without an idea.</Box>
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
        <div className="absolute left-2 top-2 h-[309px] w-[261px]" style={{ background: DUNE }}>
          {TRAITS.map((t, i) => (
            <div key={t.word} className="absolute left-7 h-[47px] w-[205px]" style={{ top: 28 + i * 71 }}>
              <span className="text-[13px] leading-[21px]" style={{ color: INK80 }}>{t.word}</span>
              <span className="absolute right-[5px] top-[7px] size-[9px] rounded-full transition-colors" style={{ background: i === active ? IGNITION : INK25 }} />
              <span className="absolute inset-x-0 top-[46px] h-px" style={{ background: FAINT }} />
              <span className="absolute left-0 top-[46px] h-px bg-[#1f1f1f] transition-[width] duration-300" style={{ width: i === active ? 198 : 0 }} />
            </div>
          ))}
          <a href={ESSAY_HREF} className="absolute left-7 top-[241px] flex h-10 w-[205px] items-center justify-between border px-4 text-[13px] leading-[21px] transition-colors hover:bg-[#e0dedb]/40" style={{ borderColor: MIST, color: INK80 }}>
            read the essay on agency
            <svg viewBox="0 0 16 16" className="size-4 opacity-75" aria-hidden><path d="M3 8h10M9 4l4 4-4 4" stroke={INK} strokeWidth={1.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
        </div>
        {TRAITS.map((t, i) => (
          <div key={t.word} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className="absolute flex h-[309px] w-[256px] flex-col justify-end p-7" style={{ left: 277 + i * 263.5, top: 8, background: DUNE }}>
            <Ill name={t.icon[0]} w={t.icon[1]} h={t.icon[2]} style={{ left: 28, top: 28 }} />
            <p className={cn(display, "text-[24px] leading-[30px] tracking-[-0.03em] text-[#1f1f1f]")}>{t.word}</p>
            <p className="mt-1.5 w-[200px] text-[13px] leading-[21px]" style={{ color: INK80 }}>{t.body}</p>
          </div>
        ))}
      </Box>
    </Section>
  );
}

// ── 02 timeline ─────────────────────────────────────────────────────────────
export const STAGES = [
  { title: "applications open", where: "online", date: "[date]", body: "start with your email. your draft saves as you go." },
  { title: "the scouting tour", where: "your city", date: "[dates]", body: "we’re coming to your city to meet you. take our in-person challenge, meet the team, and skip the line on your application." },
  { title: "applications close", where: "online", date: "[date]", body: "then: application review, a call with the team, and a final interview. decisions by [date]." },
  { title: "proving grounds", where: "a capital city in cee", date: "[dates]", body: "two weeks of building with your cohort and your pit crew." },
  { title: "the jump", where: "san francisco", date: "[dates]", body: "one month in sf, ending with demo day." },
];
const NODES = [[22, 136], [56, 102], [84, 116], [112, 62], [142, 26]] as const;
const STAGE_X = STAGES.map((_, i) => 260 + Math.round(i * 228.25));
// TODO: replace with the real tour once cities, dates and venues are set.
export const TOUR_LABELS = [[126, 89, "[next stop]"], [247, 39, "[city]"], [356, 116, "[city]"], [471, 54, "[city]"], [586, 102, "[city]"]] as const;

/** Route diagram: dashed path through five stops, filled up to this stage; the current stop is purple. */
export function Route({ stage }: { stage: number }) {
  const all = "M" + NODES.map((p) => p.join(" ")).join("L");
  const done = "M" + NODES.slice(0, stage + 1).map((p) => p.join(" ")).join("L");
  return (
    <svg viewBox="0 0 163 163" className="absolute inset-0 size-full" aria-hidden>
      <path d={all} stroke={INK} strokeOpacity={0.35} strokeDasharray="3 4" fill="none" className="hj-flow" />
      {stage > 0 && <path d={done} stroke={INK} strokeWidth={1.5} fill="none" />}
      {NODES.map(([x, y], k) =>
        k < stage ? <circle key={k} cx={x} cy={y} r={4} fill={INK} />
        : k === stage ? <g key={k}><circle cx={x} cy={y} r={9} fill="none" stroke={INK} className="hj-ping" /><circle cx={x} cy={y} r={4.5} fill={IGNITION} /></g>
        : <circle key={k} cx={x} cy={y} r={4} fill={DUNE} stroke={INK} strokeOpacity={0.5} />,
      )}
    </svg>
  );
}

function Timeline() {
  const M = 895; // scouting tour card top
  return (
    <Section id="timeline" h={1315}>
      <Panel h={854} />
      <TagStrip x={296} y={36} w={1068} label="timeline" dark solid />
      <Title>five stops, from your application to demo day.</Title>
      <Note>the route for jump 002. dates are on their way.</Note>
      <Hairline x={260} y={292} w={1140} />
      <Hairline x={260} y={653} w={1140} />
      {STAGE_X.slice(1).map((x) => <Hairline key={x} x={x - 1} y={293} w={1} h={561} />)}
      {STAGES.map((s, i) => {
        const x = STAGE_X[i]!;
        return (
          <div key={s.title}>
            <Index right={x + 227 - 32} y={325}>{String(i + 1).padStart(2, "0")}</Index>
            <Box x={x + 32} y={325} w={130} as="p" className={cn(display, "text-[20px] leading-[25px] tracking-[-0.03em] text-[#1f1f1f]")}>{s.title}</Box>
            <Box x={x + 32} y={391} className="px-2 py-1 text-[12px] leading-[17px] font-normal" style={{ background: MIST, color: INK80 }}>{s.date}</Box>
            <Box x={x + 32} y={443} w={163} h={163} style={{ background: DUNE }}>
              <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: PATTERN.hatchBack(INK) }} />
              <Corners color={INK} />
              <Route stage={i} />
            </Box>
            <Box x={x + 32} y={682} className="text-[13px] leading-[21px] font-normal" style={{ color: INK66 }}>{s.where}</Box>
            <Box x={x + 32} y={710} w={163} as="p" className="text-[13px] leading-[21px] text-[#1f1f1f]">{s.body}</Box>
          </div>
        );
      })}

      <Panel y={M} h={420} />
      <Box x={296} y={M + 36} as="p" className={cn(display, "text-[20px] leading-[27px] text-[#1f1f1f]")}>the scouting tour</Box>
      <Index right={1364} y={M + 36}>002</Index>
      <Box x={296} y={M + 87} w={680} h={297} style={{ background: DUNE }}>
        <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: PATTERN.hatchBack(INK) }} />
        <Corners color={INK} />
        <Ill name="ground" w={640} h={184} className="opacity-60" style={{ left: 20, top: 57 }} />
        <Ill name="stars" w={680} h={297} style={{ left: 0, top: 0 }} />
        {TOUR_LABELS.map(([x, y, t]) => <span key={`${x}`} className="absolute text-[12px] leading-[17px] font-normal" style={{ left: x, top: y, color: INK80 }}>{t}</span>)}
        <span className="absolute left-5 top-[261px] text-[13px] leading-[21px] font-normal" style={{ color: INK66 }}>[interactive map: city, date and venue for each stop]</span>
      </Box>
      <Box x={1012} y={M + 87} className="text-[13px] leading-[21px]" style={{ color: INK66 }}>stops</Box>
      {Array.from({ length: 5 }, (_, i) => {
        const y = M + 120 + i * 48;
        return (
          <div key={i}>
            <Hairline x={1012} y={y} w={352} />
            <Box x={1012} y={y + 14} className="text-[13px] leading-[21px]" style={{ color: INK66 }}>{String(i + 1).padStart(2, "0")}</Box>
            <Box x={1048} y={y + 14} className="text-[13px] leading-[21px] font-normal text-[#1f1f1f]">[city]</Box>
            <Box x={1162} y={y + 14} className="text-[13px] leading-[21px]" style={{ color: INK80 }}>[date]</Box>
            <span className="absolute text-[13px] leading-[21px]" style={{ right: 1440 - 1364, top: y + 14, color: INK66 }}>[venue]</span>
          </div>
        );
      })}
      <Hairline x={1012} y={M + 120 + 240} w={352} />
    </Section>
  );
}

// ── 03 conditions ───────────────────────────────────────────────────────────
// TODO: link the incorporation guide once it's written.
export const GUIDE_HREF = "#";
export const CONDITIONS = [
  { title: "be under 25", body: "at the time of your application." },
  { title: "apply solo or as a team of up to 3", body: "on your own, or with up to two co-founders." },
  { title: "get a us visa or esta", body: "don’t worry, we’ll send you supporting documents for your application." },
  { title: "register a US C-corp", body: "it’s how we invest, and how future investors will expect you to be set up.", cta: "incorporation guide" },
];

function Conditions() {
  return (
    <Section id="conditions" h={760}>
      <Panel h={760} />
      <TagStrip x={296} y={69} w={1068} label="conditions" dark solid />
      <Title x={305} y={143}>To participate, you need to:</Title>
      {CONDITIONS.map((c, i) => {
        const y = 224 + i * 132;
        return (
          <div key={c.title}>
            <Hairline x={296} y={y} w={1068} />
            <Check x={296} y={y + 36} />
            <Box x={296} y={y + 80} className="text-[12px] leading-[17px] font-normal" style={{ color: "rgba(31,31,31,0.4)" }}>{i + 1} / 4</Box>
            <Box x={368} y={y + 34} w={420} as="h3" className={cn(display, "text-[28px] leading-[35px] tracking-[-0.03em] text-[#1f1f1f]")}>{c.title}</Box>
            <Box x={836} y={y + 36} w={c.cta ? 300 : 460} as="p" className="text-[15px] leading-6" style={{ color: INK80 }}>{c.body}</Box>
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

/** Label + value over a thin rail, as on the old jump 001 tiles. `segments` draws a stepped bar instead. */
function Track({ x, y, w, label, value, fill, segments }: { x: number; y: number; w: number; label: string; value: string; fill: number; segments?: number }) {
  const sw = segments ? (w - (segments - 1) * 3) / segments : 0;
  return (
    <Box x={x} y={y} w={w} h={40}>
      <div className="flex justify-between text-[13px] leading-[21px] text-[#262626]">
        <span className="opacity-75">{label}</span><span className="font-medium opacity-75">{value}</span>
      </div>
      <div className="absolute inset-x-0 top-[34px] h-[3px]" style={{ background: SOFT }}>
        {segments
          ? Array.from({ length: segments }, (_, k) => k < fill && <span key={k} className="absolute top-0 h-full bg-[#1f1f1f]" style={{ left: k * (sw + 3), width: sw }} />)
          : <div className="h-full bg-[#1f1f1f]" style={{ width: `${Math.max(fill * 100, 0.4)}%` }} />}
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
      <Track x={867} y={C + 335} w={497} label="equity" value="5%" fill={0.05} />
      <Track x={867} y={C + 383} w={497} label="vests" value="over 2 years" fill={4} segments={12} />
      <Hairline x={867} y={C + 441} w={497} />
      <Box x={867} y={C + 477} w={260} as="p" className="text-[13px] leading-[21px] text-[#1f1f1f]">operators and mentors who work with you, not just advise you.</Box>
      <Button x={1184} y={C + 477} w={180} dark href={TEAM_HREF}>meet the team</Button>

      {/* flights and housing */}
      {card(260, S, "San Francisco", "003")}
      <Ticket x={296} y={S + 84} to="SFO" toLabel="san francisco" stay="1 month" accent={IGNITION} />
      <Box x={296} y={S + 233} w={497} as="p" className="text-[13px] leading-[21px] text-[#1f1f1f]">flights and housing in san francisco, for the full month.</Box>
      {card(831, S, "Proving Grounds", "004")}
      <Ticket x={867} y={S + 84} to="OTP" toLabel="bucharest" stay="2 weeks" accent={INK} />
      <Box x={867} y={S + 233} w={497} as="p" className="text-[13px] leading-[21px] text-[#1f1f1f]">flights and housing in capital city in Central-Eastern Europe, for the full two weeks.</Box>
    </Section>
  );
}

// ── 05 past jumpers ─────────────────────────────────────────────────────────
const MATRIX_W = 257 - 56;

function StatTile({ i, label, sub, big, children }: { i: number; label: string; sub: string; big: string; children: ReactNode }) {
  return (
    <div className="absolute h-[300px] w-[257px]" style={{ left: 8 + i * 265, top: 8, background: DUNE }}>
      <span aria-hidden className="absolute right-7 top-7 block size-[22px] opacity-75" dangerouslySetInnerHTML={{ __html: ART.layers }} />
      <p className="absolute left-7 top-7 text-[13px] leading-[21px]" style={{ color: INK80 }}>{label}</p>
      <p className="absolute left-7 top-[49px] w-[167px] text-[13px] leading-[21px]" style={{ color: INK66 }}>{sub}</p>
      <p className={cn(display, "absolute left-7 top-[100px] text-[52px] leading-[62px] tracking-[-0.03em] text-[#1f1f1f]")}>{big}</p>
      <div className="absolute left-7 top-[190px] h-[82px]" style={{ width: MATRIX_W }}>{children}</div>
    </div>
  );
}

function PastJumpers() {
  const cs = (MATRIX_W - 7 * 4) / 8, bw = (MATRIX_W - 6 * 4) / 7, ms = (MATRIX_W - 19 * 2) / 20;
  const BARS = [0.35, 0.6, 0.72, 0.66, 1, 0.5, 0.3];
  return (
    <Section id="past" h={1500}>
      <Panel h={681} />
      <TagStrip x={296} y={36} w={1068} label="past jumpers" dark solid />
      <Title>the founders who jumped before you.</Title>
      <Note>last year, in numbers. then the people behind them.</Note>
      <Box x={296} y={329} w={1068} h={316} style={{ background: MIST }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: PATTERN.hatchBack(INK) }} />
        <StatTile i={0} label="countries" sub="we went looking for builders" big="16">
          {Array.from({ length: 24 }, (_, k) => <span key={k} className="absolute" style={{ left: (k % 8) * (cs + 4), top: 10 + Math.floor(k / 8) * (cs * 0.8 + 4), width: cs, height: cs * 0.8, background: INK, opacity: k < 16 ? 1 : 0.14 }} />)}
        </StatTile>
        <StatTile i={1} label="applied" sub="to jump 001" big="300+">
          {BARS.map((h, k) => (
            <span key={k} className="absolute bottom-0 border-t border-[#1f1f1f]" style={{ left: k * (bw + 4), width: bw, height: Math.round(82 * h), background: k === 4 ? IGNITION : "rgba(187,187,181,0.66)", backgroundImage: k === 4 ? PATTERN.hatchBack(INK) : undefined }} />
          ))}
          <span className="absolute inset-x-0 bottom-0 h-px bg-[#1f1f1f]" />
        </StatTile>
        <StatTile i={2} label="teams got in" sub="out of 300+ applications" big="15">
          {Array.from({ length: 15 }, (_, k) => <span key={k} className="absolute top-[22px] h-[60px] w-[2px] bg-[#1f1f1f]" style={{ left: k * (MATRIX_W / 15) }} />)}
          <span className="absolute inset-x-0 bottom-0 h-px" style={{ background: "rgba(70,70,70,0.25)" }} />
        </StatTile>
        <StatTile i={3} label="only applied to us" sub="we were the only program they applied to" big="90%">
          {Array.from({ length: 100 }, (_, k) => <span key={k} className="absolute" style={{ left: (k % 20) * (ms + 2), top: 12 + Math.floor(k / 20) * (ms + 3), width: ms, height: ms, background: INK, opacity: k < 90 ? 0.85 : 0.14 }} />)}
        </StatTile>
      </Box>
      <Founders />
    </Section>
  );
}

/** Founders: one panel, a sideways-scrolling row of cards, one per person on the admin's Startups list. */
const CARD_W = 340, CARD_GAP = 16, SKELETONS = 4;
function Founders() {
  const P = 721;
  const jumpers = useJumpers();
  const list = jumpers.data ?? [];
  const count = list.length;
  const empty = !jumpers.isPending && count === 0;
  const strip = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ i: 0, p: 0 });
  const onScroll = () => {
    const el = strip.current; if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setPos({ i: Math.round(el.scrollLeft / (CARD_W + CARD_GAP)), p: max > 0 ? el.scrollLeft / max : 0 });
  };
  const go = (d: number) => strip.current?.scrollBy({ left: d * (CARD_W + CARD_GAP), behavior: "smooth" });
  const thumb = count > 3 ? Math.round((1068 * 3) / count) : 1068;
  return (
    <>
      <Panel y={P} h={779} />
      <Box x={296} y={P + 45} as="h3" className={cn(display, "text-[24px] leading-[30px] tracking-[-0.03em] text-[#1f1f1f]")}>the founders</Box>
      {count > 0 && <span className="absolute text-[13px] leading-[21px] tabular-nums" style={{ right: 1440 - 1243, top: P + 49, color: INK66 }}>{String(Math.min(pos.i + 1, count)).padStart(2, "0")} / {String(count).padStart(2, "0")}</span>}
      {count > 3 && [-1, 1].map((d, k) => (
        <button key={d} type="button" aria-label={d < 0 ? "Previous founders" : "Next founders"} onClick={() => go(d)} className="absolute flex size-12 items-center justify-center opacity-90 transition-opacity hover:opacity-100" style={{ left: 1267 + k * 49, top: P + 36, background: INK80 }}>
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden><path d={d < 0 ? "M10 4L6 8l4 4" : "M6 4l4 4-4 4"} stroke={DUNE} strokeWidth={1.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      ))}
      {empty ? (
        <Box x={296} y={P + 112} w={1068} h={600} className="flex items-center justify-center" style={{ background: MIST }}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: PATTERN.hatchBack(INK) }} />
          <p className="relative text-[13px] leading-[21px]" style={{ color: INK80 }}>the founders’ cards go up here soon.</p>
        </Box>
      ) : (
        <div ref={strip} onScroll={onScroll} aria-busy={jumpers.isPending || undefined} className="absolute flex snap-x snap-mandatory gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ left: 296, top: P + 112, width: 1104, height: 600 }}>
          {jumpers.isPending ? Array.from({ length: SKELETONS }, (_, i) => <FounderCard key={i} n={i + 1} />) : list.map((j, i) => <FounderCard key={j.id} n={i + 1} j={j} />)}
          <span aria-hidden className="w-5 shrink-0" />
        </div>
      )}
      {count > 3 && (
        <div className="absolute h-[3px] w-[1068px]" style={{ left: 296, top: P + 740, background: SOFT }}>
          <div className="h-full bg-[#1f1f1f]" style={{ width: thumb, marginLeft: pos.p * (1068 - thumb) }} />
        </div>
      )}
    </>
  );
}

/** One founder. Without `j` it's a loading placeholder in the same shape. */
function FounderCard({ n, j }: { n: number; j?: Jumper }) {
  const rule = "rgba(70,70,70,0.2)";
  return (
    <article className="group relative h-[600px] w-[340px] shrink-0 snap-start" style={{ background: MIST }}>
      <div className="absolute left-5 top-5 h-[220px] w-[300px] overflow-hidden" style={{ background: DUNE }}>
        {j?.photoUrl ? (
          <img src={j.photoUrl} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover grayscale transition-[filter] duration-500 group-hover:grayscale-0" />
        ) : (
          <>
            <div className="absolute inset-0 opacity-25" style={{ backgroundImage: PATTERN.halftone }} />
            {j && <span aria-hidden className={cn(display, "absolute inset-x-0 top-[78px] text-center text-[44px] leading-[52px] tracking-[-0.03em]")} style={{ color: INK25 }}>{initials(j.name)}</span>}
          </>
        )}
        <Corners color={INK} />
        <div className="absolute bottom-2.5 left-2.5 h-[51px] w-[142px] border border-black" style={{ ...ORBITRON, background: j?.photoUrl ? DUNE : undefined }}>
          <Ill name="tag-graph" w={123} h={35} style={{ left: 10, top: 9 }} />
          <span className="absolute left-[10px] top-[9px] text-[10px] leading-[13px] text-black">founder // {String(n).padStart(2, "0")}</span>
          <span className="absolute left-[10px] right-[10px] top-[22px] truncate text-[7px] leading-[9px] text-black">{j?.startup ?? "startup"}</span>
        </div>
      </div>
      {j ? (
        <>
          <p className={cn(display, "absolute left-5 top-[260px] w-[300px] truncate text-[20px] leading-[27px] text-[#1f1f1f]")}>{j.name}</p>
          <p className="absolute left-5 top-[292px] line-clamp-2 w-[300px] text-[13px] leading-[21px]" style={{ color: INK80 }}>{roleLine(j)}</p>
        </>
      ) : (
        <>
          <span className="absolute left-5 top-[264px] h-[18px] w-[180px] animate-pulse" style={{ background: SOFT }} />
          <span className="absolute left-5 top-[297px] h-3 w-[120px] animate-pulse" style={{ background: SOFT }} />
        </>
      )}
      <span className="absolute left-5 top-[336px] h-px w-[300px]" style={{ background: rule }} />
      {j?.quote ? (
        <>
          <span aria-hidden className={cn(display, "absolute left-5 top-[350px] text-[56px] leading-[56px]")} style={{ color: INK25 }}>“</span>
          <blockquote className={cn(display, "absolute left-5 top-[398px] line-clamp-5 w-[300px] text-[18px] leading-[25px] tracking-[-0.02em] text-[#1f1f1f]")}>{j.quote}</blockquote>
        </>
      ) : j?.oneLiner ? (
        <p className={cn(display, "absolute left-5 top-[360px] line-clamp-6 w-[300px] text-[18px] leading-[25px] tracking-[-0.02em]")} style={{ color: INK80 }}>{j.oneLiner}</p>
      ) : null}
      <span className="absolute left-5 top-[543px] h-px w-[300px]" style={{ background: rule }} />
      {j && (
        <>
          {j.website ? (
            <a href={j.website} target="_blank" rel="noopener noreferrer" className="absolute left-5 top-[559px] max-w-[200px] truncate text-[13px] leading-[21px] text-[#1f1f1f] underline decoration-[#1f1f1f]/30 underline-offset-4 hover:decoration-[#1f1f1f]">{j.startup}</a>
          ) : (
            <span className="absolute left-5 top-[559px] max-w-[200px] truncate text-[13px] leading-[21px] text-[#1f1f1f]">{j.startup}</span>
          )}
          <span className="absolute right-5 top-[559px] text-[13px] leading-[21px]" style={{ color: INK80 }}>{jumpLabel(j.cohort)}</span>
        </>
      )}
    </article>
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

export function Footer() {
  const line = { borderColor: LINE } as const;
  const band = { borderColor: SOFT } as const;
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
      <Box x={296} y={196} w={478} as="h2" className={cn(display, "text-[56px] leading-[67px] tracking-[-0.03em]")}>
        <span className="text-[#f5f3f0]">bring what you built. </span><span className="text-[#bbbbb5]">we’ll bring the rest.</span>
      </Box>
      <Box x={296} y={354} w={478} as="p" className="text-[15px] leading-6">$75K for 5%, a pit crew that works with you, two weeks in bucharest and a month in san francisco. flights and housing included.</Box>
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
        <img src="/landing/el/hj-emboss.svg" alt="" width={75} height={102} className="absolute left-[53px] top-[172px]" />
      </div>
      <div className="absolute left-[220px] top-[654px] h-[445px] w-[1180px] overflow-hidden" style={{ background: IGNITION, clipPath: chamferAll(16) }}>
        <div className="absolute left-10 top-0 h-[139px] w-[550px] border-r" style={band} />
        <div className="absolute left-10 top-0 h-[139px] w-[1140px] border-b" style={band} />
        <div className="absolute left-10 top-0 h-[445px] w-[1140px] border-l" style={band} />
        <div className="absolute left-[630px] top-0 h-[139px] w-[550px] border-l" style={band} />
        <div className="absolute left-[76px] top-10 text-white">
          <p className={cn(display, "text-[20px] leading-[27px]")}>open</p>
          <p className={cn(display, "text-[16px] leading-6")}>jump 002 status</p>
        </div>
        <div className="absolute left-[326px] top-10 text-white">
          <p className={cn(display, "text-[20px] leading-[27px]")}>16</p>
          <p className={cn(display, "text-[16px] leading-6")}>countries scouted for jump 001</p>
        </div>
        <p className="absolute left-[666px] top-10 w-[478px] text-[13px] leading-[21px] font-normal text-white">hyperjump is how exponential finds technical founders under 25 in central and eastern europe, years before everyone else does. bring what you built.</p>
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
      <img src="/landing/el/hj-emboss.svg" alt="" width={22} height={30} className="absolute left-[1360px] top-[1124px]" />
    </Row>
  );
}
