import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { JumpLink } from "@/components/hyperspace";
import { chamferAll, display, DUNE, IGNITION, INK, MIST, ORBITRON } from "./parts";

/*
 * Timeline, from Figma "Section / timeline": a bento of six tiles. A rail with the five steps, then one
 * tile per step with what actually happens in it. Desktop places the tiles on the 1440 grid
 * (TimelineBento); mobile stacks the same tile bodies (TimelineStack).
 */

// ── copy ────────────────────────────────────────────────────────────────────
// TODO: the selection tile says decisions by 12 apr, the rail by 15 apr; confirm one date.
export const STEPS_RAIL = [
  { label: "applications open", sub: "until 30th march" },
  { label: "the scouting tour", sub: "22 feb to 21 mar" },
  { label: "selection", sub: "final decisions by 15 apr" },
  { label: "bootcamp", sub: "two weeks, in person" },
  { label: "san francisco", sub: "one month" },
];
const FACTS = [
  { icon: "team", head: "solo or up to 3", body: "apply online as a solo founder or as a team of maximum 3 founders." },
  { icon: "idea", head: "idea optional", body: "you can apply with or without an idea. we have accepted teams that applied without an idea in the past." },
  { icon: "pivot", head: "expect to pivot", body: "we know you will pivot your idea multiple times during the program." },
] as const;
const SKILLS = [
  { icon: "lens", label: "critical thinking" },
  { icon: "grid", label: "problem solving" },
  { icon: "bolt", label: "building speed" },
] as const;
const ROUNDS = [
  { title: "review", body: "mentors and operators read and score every application." },
  { title: "10 min call", body: "top 40 get to meet the pit crew and pitch themselves." },
  { title: "shortlist call", body: "top 20 hop on a 1h call to get to know each other better." },
  { title: "decision", body: "you get a green light from us and start preparing for the program." },
];
const DAYS = ["mon", "tue", "wed", "thu", "fri"];
const WEEKS = [
  { theme: "founder & idea", topics: ["know yourself", "ideas-validation", "psychology", "storytelling", "prototyping"] },
  { theme: "market & growth", topics: ["gtm", "sales", "leadership", "fundraising", "pitching"] },
];
// TODO: the application guide and the jump 001 san francisco write-up aren't published yet.
export const APPLICATION_GUIDE_HREF = "#";
export const SF_STORY_HREF = "#";
/** The scouting tour's map card (sections.tsx / mobile.tsx) carries this id. */
export const TOUR_ANCHOR = "tour";

// ── tokens ──────────────────────────────────────────────────────────────────
const ink = (o: number) => `rgba(31,31,31,${o})`;
const H = cn(display, "pr-16 text-[30px] leading-9 tracking-[-0.9px] text-[#1f1f1f]");
const CUT = "polygon(12px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 12px) 100%, 0 100%, 0 16px)";

// ── icons (16px line drawings, from the Figma tiles) ────────────────────────
const S = { stroke: INK, strokeWidth: 1.2, fill: "none" } as const;
function Icon({ name, color }: { name: string; color?: string }) {
  const body: Record<string, ReactNode> = {
    team: <><circle cx="3" cy="8" r="2.4" fill={INK} /><circle cx="8" cy="8" r="2.4" {...S} /><circle cx="13" cy="8" r="2.4" {...S} /></>,
    idea: <><circle cx="8" cy="8" r="6" {...S} strokeDasharray="2 2" /><circle cx="8" cy="8" r="1.6" fill={INK} /></>,
    pivot: <><path d="M2.5 14V9C2.5 6.24 4.74 4 7.5 4H13.5" {...S} /><path d="M10.5 1L13.5 4L10.5 7" {...S} /></>,
    lens: <><circle cx="7" cy="7" r="5" {...S} /><path d="M10.6 10.6L14.5 14.5" {...S} /></>,
    grid: <><rect x="1.5" y="1.5" width="5.5" height="5.5" {...S} /><rect x="9" y="1.5" width="5.5" height="5.5" {...S} /><rect x="1.5" y="9" width="5.5" height="5.5" {...S} /><rect x="9" y="9" width="5.5" height="5.5" fill={INK} /></>,
    bolt: <path d="M9.5 1L3 9H8L6.5 15L13 7H8L9.5 1Z" {...S} strokeLinejoin="round" />,
    jump: <><path d="M1.5 13C1.5 6.5 6 3.5 13 3.5" stroke={color} strokeWidth={1.4} fill="none" /><path d="M10 0.5L13 3.5L10 6.5" stroke={color} strokeWidth={1.4} fill="none" /></>,
  };
  return <svg viewBox="0 0 16 16" width={16} height={16} className="shrink-0" aria-hidden>{body[name]}</svg>;
}

// ── small parts ─────────────────────────────────────────────────────────────
function Chips({ items, on = MIST }: { items: string[]; on?: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((c) => <span key={c} className="px-2.5 py-1 text-[13px] leading-[18px] font-normal text-[#1f1f1f]" style={{ background: on }}>{c}</span>)}
    </div>
  );
}

function DarkButton({ children, to, href, className }: { children: ReactNode; to?: string; href?: string; className?: string }) {
  const cls = cn("inline-flex h-[45px] shrink-0 items-center justify-center whitespace-nowrap bg-[#262626] px-9 text-[14px] leading-[21px] font-medium text-[#f5f3f0] opacity-90 transition-opacity hover:opacity-100", className);
  return to ? <JumpLink to={to} className={cls} style={{ clipPath: CUT }}>{children}</JumpLink> : <a href={href} className={cls} style={{ clipPath: CUT }}>{children}</a>;
}

/** A chamfered tile: content padded 28 / 26, with the step tag ("01 / 05") top-right. */
function Tile({ tone = DUNE, tag, className, style, children, top = 28, bottom = 28 }: { tone?: string; tag?: string; className?: string; style?: CSSProperties; children: ReactNode; top?: number; bottom?: number }) {
  return (
    <div className={cn("relative", className)} style={{ background: tone, clipPath: chamferAll(16), ...style }}>
      {tag && <span className="absolute right-7 top-[38px] text-[11px] leading-[14px]" style={{ ...ORBITRON, color: ink(0.45) }}>{tag}</span>}
      <div className="flex h-full flex-col gap-3 px-7" style={{ paddingTop: top, paddingBottom: bottom }}>{children}</div>
    </div>
  );
}

// ── tile bodies (shared by desktop and mobile) ──────────────────────────────
function StepsRail({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <ol className="relative">
        <span aria-hidden className="absolute bottom-3 left-[3px] top-3 w-px" style={{ background: ink(0.15) }} />
        {STEPS_RAIL.map((s, i) => (
          <li key={s.label} className="relative flex items-start gap-4 py-2">
            <span aria-hidden className="relative mt-[7px] size-[7px] shrink-0 rounded-full" style={i === 0 ? { background: IGNITION } : { background: DUNE, boxShadow: `inset 0 0 0 1px ${ink(0.5)}` }} />
            <div>
              <p className="text-[15px] leading-5 font-normal text-[#1f1f1f]"><span className="mr-2 text-[11px]" style={{ ...ORBITRON, color: ink(0.45) }}>{String(i + 1).padStart(2, "0")}</span>{s.label}</p>
              <p className="text-[13px] leading-[19px]" style={{ color: ink(0.6) }}>{s.sub}</p>
            </div>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ol className="relative flex">
      <span aria-hidden className="absolute inset-x-0 top-[23px] h-px" style={{ background: ink(0.15) }} />
      {STEPS_RAIL.map((s, i) => (
        <li key={s.label} className="relative flex flex-1 flex-col gap-1.5">
          <span className="text-[11px] leading-[14px]" style={{ ...ORBITRON, color: ink(0.45) }}>{String(i + 1).padStart(2, "0")}</span>
          <span aria-hidden className="size-[7px] rounded-full" style={i === 0 ? { background: IGNITION } : { background: DUNE, boxShadow: `inset 0 0 0 1px ${ink(0.5)}` }} />
          <span className="mt-0.5 text-[16px] leading-[22px] font-normal text-[#1f1f1f]">{s.label}</span>
          <span className="text-[14px] leading-5" style={{ color: ink(0.6) }}>{s.sub}</span>
        </li>
      ))}
    </ol>
  );
}

function Applications({ compact }: { compact?: boolean }) {
  return (
    <>
      <h3 className={H}>applications open</h3>
      <Chips items={["jump 02", "accepting applications until 30th march"]} />
      <ul className={cn("flex gap-1.5", compact && "flex-col")}>
        {FACTS.map((f) => (
          <li key={f.head} className="flex flex-1 flex-col gap-1 p-3" style={{ background: MIST }}>
            <Icon name={f.icon} />
            <p className={cn(display, "mt-1.5 text-[18px] leading-6 text-[#1f1f1f]")}>{f.head}</p>
            <p className="text-[13px] leading-[19px]" style={{ color: ink(0.75) }}>{f.body}</p>
          </li>
        ))}
      </ul>
      <p className="text-[14px] leading-[22px]" style={{ color: ink(0.8) }}>
        what we’re actually looking for is exceptional teams and solo founders. we’ve written a guide to building a great application for hyperjump and we recommend teams to take a look before submitting theirs.
      </p>
      <div className="flex-1" />
      <div className="flex flex-wrap gap-2">
        <DarkButton to="/sign-in">apply now</DarkButton>
        <DarkButton href={APPLICATION_GUIDE_HREF}>guide to a great application</DarkButton>
      </div>
    </>
  );
}

function ScoutingTour({ compact }: { compact?: boolean }) {
  return (
    <>
      <h3 className={H}>the scouting tour</h3>
      <Chips items={["22 feb to 21 mar", "16 cities in cee"]} on={DUNE} />
      <p className="text-[14px] leading-[22px]" style={{ color: ink(0.8) }}>
        our head of program travels in-person to 16 cities to meet you in-person and challenge you to spot the most talented future founders. by attending our local events, you significantly increase your chances to be selected in the program.
      </p>
      <div className="flex flex-col gap-1.5">
        <p className="text-[13px] leading-[18px] font-medium" style={{ color: ink(0.55) }}>we will challenge your</p>
        <ul className={cn("flex gap-1.5", compact && "flex-col")}>
          {SKILLS.map((s) => (
            <li key={s.label} className="flex flex-1 items-center gap-2 whitespace-nowrap p-3 text-[14px] leading-5 font-normal text-[#1f1f1f]" style={{ background: DUNE }}>
              <Icon name={s.icon} />{s.label}
            </li>
          ))}
        </ul>
      </div>
      <p className="flex items-center gap-2.5 p-3 text-[14px] leading-5 font-normal text-[#1f1f1f]" style={{ background: DUNE }}>
        <Icon name="jump" color={IGNITION} />
        solve our challenge and get fast-tracked to an interview with our investment team.
      </p>
      <div className="flex-1" />
      <div><DarkButton href={`#${TOUR_ANCHOR}`}>find out when we are coming to your city</DarkButton></div>
    </>
  );
}

function Selection({ compact }: { compact?: boolean }) {
  return (
    <>
      <h3 className={H}>how you get selected.</h3>
      <Chips items={["application close 30 mar", "final decisions by 12 apr"]} />
      <div className="flex-1" />
      <ol className="grid grid-cols-2 gap-1.5">
        {ROUNDS.map((r, i) => (
          <li key={r.title} className="flex flex-col gap-1 p-3" style={{ background: MIST }}>
            <span className="text-[11px] leading-[14px]" style={{ ...ORBITRON, color: ink(0.5) }}>{String(i + 1).padStart(2, "0")}</span>
            <p className={cn(display, "text-[18px] leading-6 text-[#1f1f1f]")}>{r.title}</p>
            <p className="text-[13px] leading-[19px]" style={{ color: ink(0.75) }}>{r.body}</p>
          </li>
        ))}
      </ol>
    </>
  );
}

function Bootcamp({ compact }: { compact?: boolean }) {
  return (
    <>
      <h3 className={H}>two weeks in-person bootcamp</h3>
      <Chips items={["with your pit crew"]} />
      <div className="flex-1" />
      {WEEKS.map((w, k) => (
        <div key={w.theme} className="flex flex-col gap-2">
          <p className="text-[14px] leading-5">
            <span className="font-medium" style={{ color: ink(0.45) }}>week {k + 1} //</span> <span className="font-normal text-[#1f1f1f]">{w.theme}</span>
          </p>
          <ol className={cn("grid gap-1", compact ? "grid-cols-2" : "grid-cols-5")}>
            {w.topics.map((t, i) => (
              <li key={t} className="flex flex-col gap-0.5 px-2.5 py-2.5" style={{ background: MIST }}>
                <span className="text-[11px] leading-[14px] font-normal" style={{ color: ink(0.55) }}>{DAYS[i]}</span>
                <span className="text-[13px] leading-[18px] font-normal" style={{ color: ink(0.9) }}>{t}</span>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </>
  );
}

function SanFrancisco({ compact }: { compact?: boolean }) {
  return (
    <>
      <div className={cn("flex gap-6", compact && "flex-col gap-3")}>
        <div className={cn("flex flex-col gap-2", !compact && "w-[477px] shrink-0")}>
          <h3 className={H}>one month in san francisco</h3>
          <p className="text-[15px] leading-6 text-[#1f1f1f]">
            flights and housing covered for the full month.<br />
            <a href={SF_STORY_HREF} className="underline decoration-[#1f1f1f]/40 underline-offset-2 transition-colors hover:decoration-[#1f1f1f]">read about our jumper’s experience in the city.</a>
          </p>
        </div>
        <div className={cn("space-y-3 text-[15px] leading-6 text-[#1f1f1f]", !compact && "w-[533px]")}>
          <p>there’s no place in the world like silicon valley. we’re taking you there to experience what it feels like to build at the edge of the frontier.</p>
          <p>your time in the us will include minimal workshop sessions and check-ins with the pit crew so you can focus on meeting customers and growing your company.</p>
        </div>
      </div>
      <div className="flex-1" />
      {/* golden gate, the headlands and the city: a line drawing, purple dot on the pyramid */}
      <img src="/landing/el/golden-gate.svg" alt="" width={1084} height={130} className={cn("block max-w-none", compact && "w-full h-auto")} />
    </>
  );
}

// ── desktop: tiles on the 1440 grid ────────────────────────────────────────
/** Bento height on first paint (measured); the real height is reported through onHeight. */
export const BENTO_H = 1323;

/** Rows grow with their copy; the section below moves with them (onHeight, in page px). */
export function TimelineBento({ onHeight }: { onHeight?: (h: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current; if (!el || !onHeight) return;
    const report = () => onHeight(el.offsetHeight);
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onHeight]);
  return (
    <div ref={ref} className="absolute left-[260px] top-0 flex w-[1140px] flex-col gap-px">
      <Tile><StepsRail /></Tile>
      <div className="flex">
        <Tile tag="01 / 05" className="w-[590px]"><Applications /></Tile>
        <Tile tag="02 / 05" tone={MIST} className="w-[550px]"><ScoutingTour /></Tile>
      </div>
      <div className="flex gap-px">
        <Tile tag="03 / 05" className="w-[460px]"><Selection /></Tile>
        <Tile tag="04 / 05" className="w-[679px]"><Bootcamp /></Tile>
      </div>
      <Tile tag="05 / 05" bottom={10}><SanFrancisco /></Tile>
    </div>
  );
}

// ── mobile: the same tiles, stacked ─────────────────────────────────────────
export function TimelineStack() {
  const cls = "mx-3";
  return (
    <div className="space-y-1">
      <Tile className={cls} top={24}><StepsRail compact /></Tile>
      <Tile className={cls} tag="01 / 05"><Applications compact /></Tile>
      <Tile className={cls} tag="02 / 05" tone={MIST}><ScoutingTour compact /></Tile>
      <Tile className={cls} tag="03 / 05"><Selection compact /></Tile>
      <Tile className={cls} tag="04 / 05"><Bootcamp compact /></Tile>
      <Tile className={cls} tag="05 / 05"><SanFrancisco compact /></Tile>
    </div>
  );
}
