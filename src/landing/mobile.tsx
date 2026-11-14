import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type MutableRefObject, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { JumpLink } from "@/components/hyperspace";
import { EXPONENTIAL_HREF, HERO_SUB, HERO_TITLE, STEPS, TIPS } from "./content";
import { TimelineStack, TOUR_ANCHOR } from "./timeline";
import { VestingRuler } from "./vesting";
import { Arrival } from "./arrival";
import { Ill } from "./ill";
import { useJumpers } from "./jumpers";
import { MAP_H, MAP_W, shipTopFor, StopDetails, StopList, TOUR_WHY, TourMap, useSelectedStop, useTour } from "./tour";
import { StartupTile, StartupTileSkeleton } from "./people";
import { CrewCard, STATIONS, useCrewPhotos } from "./crew";
import { chamfer, chamferAll, Corners, display, DUNE, IconMail, IconSearch, IconShare, IconShield, IGNITION, INK, LINE, MIST, ORBITRON, PATTERN, STONE } from "./parts";
import {
  AGREEMENT_HREF, CONDITIONS, CONTACT_HREF, ELSEWHERE, FAQS, GUIDE_HREF, HAVE, PAGES, Star, TEAM_HREF, TRAITS,
} from "./sections";

const ShipScene = lazy(() => import("./ship-scene"));

/*
 * Mobile landing (below 1024px), from Figma "Landing / Mobile 390": one column in normal flow, same copy,
 * illustrations and motion as desktop. Panels are inset 12px; content sits 20px inside them.
 */

const INK80 = "rgba(31,31,31,0.8)", INK66 = "rgba(31,31,31,0.66)", INK25 = "rgba(31,31,31,0.25)";
const SOFT = "rgba(70,70,70,0.14)";

type Ship = { url: string; tone?: number };

export function LandingMobile({ ship, progress, launched, tipEls, reducedMotion }: { ship: Ship; progress: MutableRefObject<number>; launched: MutableRefObject<boolean>; tipEls: MutableRefObject<(HTMLDivElement | null)[]>; reducedMotion: boolean }) {
  return (
    <div className="mx-auto w-full max-w-[560px] pb-0">
      <MHeader />
      <MHero ship={ship} progress={progress} launched={launched} tipEls={tipEls} reducedMotion={reducedMotion} />
      <MOverview />
      <MBanner />
      <div className="space-y-6 py-10">
        <MWhoFor />
        <MWhatYouGet />
        <MPitCrew />
        <MPastJumpers />
        <MTimeline shipUrl={ship.url} />
        <MConditions />
        <MFaq />
      </div>
      <MFooter shipUrl={ship.url} shipTone={ship.tone} />
    </div>
  );
}

// ── primitives ──────────────────────────────────────────────────────────────
function Panel({ children, className, tone = "dune", id }: { children: ReactNode; className?: string; tone?: "dune" | "mist"; id?: string }) {
  return <div id={id} className={cn("relative mx-3 scroll-mt-16 px-5 py-7", className)} style={{ background: tone === "dune" ? DUNE : MIST, clipPath: chamferAll(12) }}>{children}</div>;
}

/** Tag strip in flow. `onDark`: stone at 25% (dark sections); otherwise solid ink (light panels). */
function Tag({ label, onDark = false }: { label: string; onDark?: boolean }) {
  const c = onDark ? STONE : INK;
  return (
    <div className="relative h-10" style={{ color: c }}>
      <span className="absolute inset-x-0 top-0 h-px" style={{ background: c, opacity: onDark ? 0.25 : 1 }} />
      <div className="absolute inset-x-0 top-[10px] flex h-[21px] items-center gap-3">
        <span className="size-[9px] shrink-0 rounded-full" style={{ background: c }} />
        <span className="shrink-0 text-[12px] leading-[21px] font-normal">{label}</span>
        <span className="ml-[14px] h-[15px] flex-1" style={{ backgroundImage: PATTERN.hatch(c), opacity: onDark ? 0.5 : 0.45 }} />
      </div>
      <span className="absolute inset-x-0 top-[39px] h-px" style={{ background: c, opacity: onDark ? 0.25 : 1 }} />
    </div>
  );
}

function Title({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn(display, "mt-8 text-[28px] leading-[34px] tracking-[-0.03em] text-[#1f1f1f]", className)}>{children}</h2>;
}

function Sub({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn(display, "text-[20px] leading-[26px] tracking-[-0.03em] text-[#1f1f1f]", className)}>{children}</h3>;
}

function Index({ children }: { children: ReactNode }) {
  return <span className="text-[12px] leading-[21px] font-normal" style={{ color: INK25 }}>{children}</span>;
}

/** Hatched square with corner brackets and an animated illustration centred in it. */
function ArtSquare({ size, name, w, h }: { size: number; name: Parameters<typeof Ill>[0]["name"]; w: number; h: number }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size, background: DUNE }}>
      <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: PATTERN.hatchBack(INK) }} />
      <Corners color={INK} size={6} />
      <Ill name={name} w={w} h={h} style={{ left: (size - w) / 2, top: (size - h) / 2 }} />
    </div>
  );
}

function DarkButton({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return <a href={href} className={cn("flex h-[45px] w-full items-center justify-center text-[13px] leading-[21px] font-medium text-[#f5f3f0] opacity-90 transition-opacity active:opacity-100", className)} style={{ background: "#262626", clipPath: chamfer(16) }}>{children}</a>;
}

function Check() {
  return (
    <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#262626]">
      <svg viewBox="0 0 14 14" width={14} height={14}><path d="M3 7.4l2.6 2.6 5.4-5.6" stroke={DUNE} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </span>
  );
}

/** Scales a fixed-size desktop composition to the width it's given (keeps its aspect). */
function Scaled({ w, h, children }: { w: number; h: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(0.48);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setS(el.clientWidth / w));
    ro.observe(el);
    return () => ro.disconnect();
  }, [w]);
  return (
    <div ref={ref} className="relative w-full overflow-hidden" style={{ aspectRatio: `${w} / ${h}` }}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: w, height: h, transform: `scale(${s})` }}>{children}</div>
    </div>
  );
}

/** Index of the card nearest the left edge of a horizontally scrolling row. */
function useRowIndex(step: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const [p, setP] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const on = () => { setI(Math.round(el.scrollLeft / step)); const max = el.scrollWidth - el.clientWidth; setP(max > 0 ? el.scrollLeft / max : 0); };
    el.addEventListener("scroll", on, { passive: true });
    return () => el.removeEventListener("scroll", on);
  }, [step]);
  return { ref, i, p };
}

const rowCls = "flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

// ── header + menu ───────────────────────────────────────────────────────────
const MENU = [["it’s for you if", "#who"], ["what you get", "#get"], ["pit crew", "#crew"], ["past jumpers", "#past"], ["timeline", "#timeline"], ["conditions", "#conditions"], ["faq", "#faq"]];

function MHeader() {
  const [open, setOpen] = useState(false);
  useEffect(() => { document.documentElement.style.overflow = open ? "hidden" : ""; return () => { document.documentElement.style.overflow = ""; }; }, [open]);
  return (
    <header className="fixed inset-x-0 top-0 z-50 h-14 border-b backdrop-blur-[8px]" style={{ borderColor: LINE, background: "rgba(37,36,34,0.92)" }}>
      <div className="relative mx-auto flex h-full max-w-[560px] items-stretch">
        <a href="#top" aria-label="HyperJump home" onClick={() => setOpen(false)} className="ml-3 flex w-[124px] items-center px-3" style={{ background: IGNITION }}>
          <img src="/landing/el/wordmark.svg" alt="" width={100} height={10} className="block" />
        </a>
        <JumpLink to="/sign-in" className="ml-auto flex w-24 items-center justify-center text-[18px] leading-[21px] font-black text-white" style={{ background: IGNITION, ...ORBITRON }}>apply</JumpLink>
        <button type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-14 items-center justify-center">
          <svg viewBox="0 0 22 12" width={22} height={12} aria-hidden>
            <path d={open ? "M3 0l16 12M3 12L19 0" : "M0 1H22M0 11H22"} stroke={DUNE} strokeWidth={1.5} className="transition-all" />
          </svg>
        </button>
      </div>
      {open && (
        <nav aria-label="Menu" className="fixed inset-x-0 bottom-0 top-14 overflow-y-auto bg-[#1f1f1f] px-5 pb-10 pt-6 animate-[hjfade_250ms_ease-out]">
          <div className="mx-auto max-w-[520px]">
            {MENU.map(([label, href], i) => (
              <a key={href} href={href} onClick={() => setOpen(false)} className="flex items-center gap-4 border-b py-4" style={{ borderColor: LINE }}>
                <span className="w-5 text-[12px] text-[#bbbbb5]/65">{String(i + 1).padStart(2, "0")}</span>
                <span className={cn(display, "text-[24px] leading-[30px] tracking-[-0.03em] text-[#f5f3f0]")}>{label}</span>
              </a>
            ))}
            <JumpLink to="/sign-in" onClick={() => setOpen(false)} className="mt-8 flex h-[53px] w-full items-center justify-center text-[16px] font-bold text-[#1f1f1f]" style={{ background: MIST, clipPath: chamfer(16), ...ORBITRON }}>apply to jump 02</JumpLink>
          </div>
        </nav>
      )}
    </header>
  );
}

// ── hero ────────────────────────────────────────────────────────────────────
function MHero({ ship, progress, launched, tipEls, reducedMotion }: { ship: Ship; progress: MutableRefObject<number>; launched: MutableRefObject<boolean>; tipEls: MutableRefObject<(HTMLDivElement | null)[]>; reducedMotion: boolean }) {
  const stage = useRef<HTMLDivElement>(null);
  // No scroll lock on phones: the ship launches once its stage is mostly on screen.
  useEffect(() => {
    const el = stage.current; if (!el) return;
    let t = 0;
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { t = window.setTimeout(() => { launched.current = true; }, 350); io.disconnect(); } }, { threshold: 0.45 });
    io.observe(el);
    return () => { io.disconnect(); window.clearTimeout(t); };
  }, [launched]);
  return (
    <section id="top" className="relative pt-14">
      <div className="px-5 pt-8">
        <Tag label="jump 002, applications open" onDark />
        <h1 className={cn(display, "mt-6 text-[46px] leading-[48px] tracking-[-0.03em] text-white")}>{HERO_TITLE[0]} {HERO_TITLE[1]}</h1>
        <p className="mt-5 text-[15px] leading-6">{HERO_SUB.join(" ")}</p>
        <JumpLink to="/sign-in" className="mt-7 flex h-[53px] w-full items-center justify-center text-[16px] leading-[21px] font-bold text-[#1f1f1f] opacity-90 active:opacity-100" style={{ background: MIST, clipPath: chamfer(16), ...ORBITRON }}>apply to jump 02</JumpLink>
      </div>
      <div ref={stage} className="relative mt-9 h-[340px] border-y" style={{ borderColor: LINE, background: "#1e1d2a" }}>
        <Suspense fallback={null}>
          <ShipScene compact model={ship.url} tone={ship.tone} progress={progress} launched={launched} tips={TIPS} tipEls={tipEls} reducedMotion={reducedMotion} />
        </Suspense>
        {/* numbered markers, positioned on the ship by the scene */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {TIPS.map((tip, i) => (
            <div key={tip.anchor} ref={(el) => { tipEls.current[i] = el; }} className="absolute left-0 top-0 opacity-0 will-change-transform">
              <span className="absolute -left-[5px] -top-[5px] size-2.5 rounded-full bg-[#9999FF] shadow-[0_0_12px_2px_rgba(153,153,255,0.75)]" />
              <span className="absolute left-2 -top-5 text-[11px] leading-[14px] font-normal text-[#f5f3f0]">{String(i + 1).padStart(2, "0")}</span>
            </div>
          ))}
        </div>
      </div>
      <ol className="px-5 pt-2">
        {TIPS.map((t, i) => (
          <li key={t.anchor} className="flex gap-4 border-b py-3" style={{ borderColor: LINE }}>
            <span className="w-5 pt-0.5 text-[12px] leading-[17px] font-normal text-[#bbbbb5]/65">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <p className={cn(display, "text-[16px] leading-[21px] text-[#f5f3f0]")}>{t.title}</p>
              <p className="mt-0.5 text-[13px] leading-[19px]">{t.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="h-8" />
    </section>
  );
}

// ── overview ────────────────────────────────────────────────────────────────
function MOverview() {
  const icons = [<IconSearch key="s" />, <IconShield key="sh" />, <IconShare key="u" />, <IconMail key="m" />];
  const W = "text-white", D = "text-[#f5f3f0]";
  return (
    <section className="border-y bg-[#1f1f1f] px-5 py-10" style={{ borderColor: LINE }}>
      <Tag label="overview" onDark />
      <p className={cn(display, "mt-8 text-[24px] leading-[30px] tracking-[-0.03em]")}>
        hyperjump is an <span className={D}>accelerator</span> <span className={W}>for builders under 26 </span>from central and eastern europe.
      </p>
      <p className={cn(display, "mt-6 text-[24px] leading-[30px] tracking-[-0.03em]")}>
        <span className={D}>We invest</span> in your company, provide a team of <span className={D}>experienced operators</span>, and give you the <span className={D}>time, money and network to</span> build something serious, <span className={D}>years earlier than you’ve planned.</span>
      </p>
      <div className="relative mt-10 border px-5 pb-6 pt-5" style={{ borderColor: "rgba(187,187,181,0.1)" }}>
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: PATTERN.hatchBack(DUNE) }} />
        <Corners />
        <div className="relative flex items-center gap-4"><span className="text-[13px] leading-[21px] text-[#f5f3f0]">How to join</span><span className="h-px w-[120px]" style={{ background: "rgba(187,187,181,0.66)" }} /></div>
        <ol className="relative mt-5">
          {STEPS.map((s, i) => (
            <li key={s}>
              <div className="relative flex min-h-[58px] items-center gap-4 border bg-[#1f1f1f] px-4 py-2" style={{ borderColor: LINE }}>
                <Corners />
                <span className="w-5 text-[13px] text-[#bbbbb5]/65">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex-1 text-[13px] leading-5">{s}</span>
                <span className="size-[21px] shrink-0">{icons[i]}</span>
              </div>
              {i < STEPS.length - 1 && (
                <svg viewBox="0 0 24 24" className="mx-auto my-1 block size-6" aria-hidden><path d="M12 21V3M12 21l-7-7M12 21l7-7" fill="none" stroke="#f0e7da" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ── powered by exponential ──────────────────────────────────────────────────
function MBanner() {
  return (
    <div className="pt-6">
      <Panel>
        <Tag label="powered by exponential" />
        <p className={cn(display, "mt-6 text-[22px] leading-[28px] tracking-[-0.03em]")}>
          <span className="text-[#666666]">we’re part of exponential, a venture capital fund based in san francisco investing in startups. </span>
          <span style={{ color: INK }}>hyperjump is the first step for founders who want to grow with us.</span>
        </p>
        <img src="/landing/el/exponential.svg" alt="exponential" width={170} height={57} className="-ml-2.5 mt-6" />
        <DarkButton href={EXPONENTIAL_HREF} className="mt-5">read more</DarkButton>
      </Panel>
    </div>
  );
}

// ── it's for you if… ─────────────────────────────────────────────────────────
function MWhoFor() {
  const row = useRowIndex(308);
  return (
    <section id="who" className="scroll-mt-16">
      <Panel>
        <Tag label="it’s for you if…" />
        <Title>you’re under 26, technical, and you’ve been building things for longer than you’ve been allowed to vote.</Title>
        <p className="mt-4 text-[17px] leading-6" style={{ color: INK80 }}>you can apply with or without an idea.</p>
        <Sub className="mt-9">you probably have one or more of these:</Sub>
      </Panel>
      <div ref={row.ref} className={cn(rowCls, "mt-2")}>
        {HAVE.map((c, i) => (
          <article key={c.title} className="relative w-[300px] shrink-0 snap-start p-5" style={{ background: DUNE, clipPath: chamferAll(12) }}>
            <div className="flex items-baseline justify-between"><p className={cn(display, "text-[18px] leading-6 text-[#1f1f1f]")}>{c.title}</p><Index>{String(i + 1).padStart(3, "0")}</Index></div>
            <div className="mt-4"><ArtSquare size={260} name={c.art[0]} w={Math.round(c.art[1] * 0.85)} h={Math.round(c.art[2] * 0.85)} /></div>
            <p className="mt-5 text-[14px] leading-[22px] text-[#1f1f1f]">{c.body}</p>
          </article>
        ))}
        <span aria-hidden className="w-1 shrink-0" />
      </div>
      <div className="mt-4 flex justify-center gap-2" aria-hidden>
        {HAVE.map((c, i) => <span key={c.title} className="size-2 rounded-full transition-colors" style={{ background: i === Math.min(row.i, HAVE.length - 1) ? DUNE : "rgba(187,187,181,0.35)" }} />)}
      </div>
      <Panel className="mt-6">
        <Sub>we care about three things:</Sub>
        <div className="relative mt-5 space-y-2 p-2" style={{ background: MIST }}>
          <div className="absolute inset-0 opacity-35" style={{ backgroundImage: PATTERN.hatchBack(INK) }} />
          {TRAITS.map((t, i) => (
            <div key={t.word} className="relative flex min-h-[132px] items-center gap-5 px-5 py-4" style={{ background: DUNE }}>
              <span className="relative block size-20 shrink-0">
                <Ill name={t.icon[0]} w={Math.round(t.icon[1] * 0.75)} h={Math.round(t.icon[2] * 0.75)} style={{ left: (80 - t.icon[1] * 0.75) / 2, top: (80 - t.icon[2] * 0.75) / 2 }} />
              </span>
              <div>
                <p className={cn(display, "text-[22px] leading-7 tracking-[-0.03em] text-[#1f1f1f]")}>{t.word}</p>
                <p className="mt-1.5 text-[13px] leading-5 text-balance" style={{ color: INK80 }}>{t.body}</p>
                {t.link && <a href={t.link.href} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[13px] leading-5 text-[#1f1f1f] underline decoration-[#1f1f1f]/35 underline-offset-4">{t.link.label}</a>}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

// ── timeline ────────────────────────────────────────────────────────────────
function MTimeline({ shipUrl }: { shipUrl: string }) {
  const tour = useTour();
  const [selected, setSelected] = useSelectedStop(tour);
  return (
    <section id="timeline" className="scroll-mt-16 space-y-6">
      <TimelineStack />
      <Panel id={TOUR_ANCHOR}>
        <h3 className={cn(display, "text-[26px] leading-8 tracking-[-0.03em] text-[#1f1f1f]")}>the scouting tour</h3>
        <p className="mt-3 text-[15px] leading-6" style={{ color: INK80 }}>{TOUR_WHY}</p>
        <div className="-mx-2 mt-5">
          <Scaled w={MAP_W} h={MAP_H}>
            <TourMap tour={tour} shipSrc={shipTopFor(shipUrl)} selected={selected} onSelect={setSelected} />
          </Scaled>
        </div>
        <StopDetails tour={tour} selected={selected} className="mt-7" />
        <StopList tour={tour} selected={selected} onSelect={setSelected} className="mt-9" />
      </Panel>
    </section>
  );
}

// ── conditions ──────────────────────────────────────────────────────────────
function MConditions() {
  return (
    <section id="conditions" className="scroll-mt-16">
      <Panel>
        <Tag label="conditions" />
        <Title>To participate, you need to:</Title>
        <ol className="mt-7">
          {CONDITIONS.map((c, i) => (
            <li key={c.title} className="flex gap-5 border-t py-6" style={{ borderColor: SOFT }}>
              <div className="shrink-0"><Check /></div>
              <div className="min-w-0">
                <h3 className={cn(display, "text-[22px] leading-7 tracking-[-0.03em] text-[#1f1f1f]")}>{c.title}</h3>
                <p className="mt-2 text-[15px] leading-6" style={{ color: INK80 }}>{c.body}</p>
                {c.cta && <DarkButton href={GUIDE_HREF} className="mt-4">{c.cta}</DarkButton>}
              </div>
            </li>
          ))}
        </ol>
      </Panel>
    </section>
  );
}

// ── what you get ────────────────────────────────────────────────────────────
function Track({ label, value, fill }: { label: string; value: string; fill: number }) {
  return (
    <div className="mt-3">
      <div className="flex justify-between text-[13px] leading-[21px] text-[#262626]"><span className="opacity-75">{label}</span><span className="font-medium opacity-75">{value}</span></div>
      <div className="relative mt-2 h-[3px]" style={{ background: SOFT }}>
        <span className="block h-full bg-[#1f1f1f]" style={{ width: `${Math.max(fill * 100, 1)}%` }} />
      </div>
    </div>
  );
}

/** Vesting as one 24-month ruler (same as desktop, fluid width). */
/** Ticket turned on its side: route on top, a perforation, the stay on the stub. */
function Ticket({ to, toLabel, stay, accent }: { to: string; toLabel: string; stay: string; accent: string }) {
  const big = cn(display, "text-[32px] leading-10 tracking-[-0.03em] text-[#1f1f1f]");
  const small = "text-[12px] leading-[17px]";
  return (
    <div className="relative mt-5" style={{ background: MIST }}>
      <div className="flex items-start justify-between px-5 pb-4 pt-4">
        <div><p className={small} style={{ color: INK66 }}>from</p><p className={big}>home</p><p className={small} style={{ color: INK66 }}>your city</p></div>
        <svg viewBox="0 0 100 20" className="mt-9 h-5 flex-1 px-3" preserveAspectRatio="none" aria-hidden>
          <path d="M0 10H86" stroke={INK} strokeOpacity={0.5} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" className="hj-flow" />
        </svg>
        <svg viewBox="-9 -9 18 18" className="mt-[42px] size-4 shrink-0" aria-hidden><Star r={8} color={accent} className="hj-star" /></svg>
        <div className="ml-3"><p className={small} style={{ color: INK66 }}>to</p><p className={big}>{to}</p><p className={small} style={{ color: INK66 }}>{toLabel}</p></div>
      </div>
      {/* perforation, with notches cut into both edges */}
      <div className="relative h-0">
        <div className="mx-4 border-t border-dashed" style={{ borderColor: "rgba(31,31,31,0.35)" }} />
        <span aria-hidden className="absolute -left-[9px] -top-[9px] size-[18px] rounded-full" style={{ background: DUNE }} />
        <span aria-hidden className="absolute -right-[9px] -top-[9px] size-[18px] rounded-full" style={{ background: DUNE }} />
      </div>
      <div className="flex items-end justify-between px-5 pb-4 pt-3">
        <div><p className={small} style={{ color: INK66 }}>stay</p><p className={cn(display, "text-[24px] leading-[30px] tracking-[-0.03em] text-[#1f1f1f]")}>{stay}</p></div>
        <p className={small} style={{ color: INK66 }}>jump 002, dates tbc</p>
      </div>
    </div>
  );
}

function MWhatYouGet() {
  const [tip, setTip] = useState(false);
  const big = cn(display, "text-[44px] leading-[50px] tracking-[-0.03em] text-[#1f1f1f]");
  const head = (title: string, idx: string) => <div className="flex items-baseline justify-between"><p className={cn(display, "text-[18px] leading-6 text-[#1f1f1f]")}>{title}</p><Index>{idx}</Index></div>;
  return (
    <section id="get" className="scroll-mt-16 space-y-2">
      <Panel>
        <Tag label="what you get" />
        <Title>Every team we pick receives:</Title>
        <div className="mt-5 h-[2px] bg-[#262626]" />
      </Panel>
      <Panel>
        {head("capital", "001")}
        <div className="mt-5 flex items-start justify-between gap-4"><p className={big}>$75K<br />for 5%</p><ArtSquare size={120} name="growth" w={92} h={74} /></div>
        <div className="mt-4"><Track label="equity" value="5%" fill={0.05} /><Track label="post-money valuation cap" value="$1.5M" fill={1} /></div>
        <div className="mt-5 h-px" style={{ background: SOFT }} />
        <p className="mt-5 text-[14px] leading-[22px] text-[#1f1f1f]">on a SAFE. standard, founder-friendly, no surprises.</p>
        <DarkButton href={AGREEMENT_HREF} className="mt-4">read the investment agreement</DarkButton>
      </Panel>
      <Panel>
        {head("pit crew", "002")}
        <div className="mt-5 flex items-start justify-between gap-4">
          <p className={big}>
            5%<br />
            <button type="button" aria-expanded={tip} aria-describedby="vested-tip-m" onClick={() => setTip((t) => !t)} onBlur={() => setTip(false)} className="relative text-left">
              vested
              <span aria-hidden className="absolute -bottom-0.5 left-0.5 h-0 w-full border-b-[1.5px] border-dashed border-[#1f1f1f]" />
              <span id="vested-tip-m" role="tooltip" className={cn("absolute left-0 top-[64px] z-10 w-[240px] bg-[#262626] px-3.5 py-3 font-[family-name:var(--font-sans)] text-[12px] leading-[17px] font-light tracking-normal text-[#f5f3f0] transition-[opacity,transform,visibility] duration-200", tip ? "visible translate-y-0 opacity-100" : "invisible translate-y-1 opacity-0")}>
                <span aria-hidden className="absolute -top-[7px] left-6 h-0 w-0 border-x-[6px] border-b-[7px] border-x-transparent border-b-[#262626]" />
                vesting means the equity is earned over time, not handed over on day one. if we stop showing up, we stop earning it.
              </span>
            </button>
          </p>
          <ArtSquare size={120} name="profiles" w={96} h={83} />
        </div>
        <div className="mt-4"><VestingRuler className="mt-3" /></div>
        <div className="mt-5 h-px" style={{ background: SOFT }} />
        <p className="mt-5 text-[14px] leading-[22px] text-[#1f1f1f]">operators and mentors who work with you, not just advise you.</p>
        <DarkButton href={TEAM_HREF} className="mt-4">meet the team</DarkButton>
      </Panel>
      <Panel>
        {head("San Francisco", "003")}
        <Ticket to="SFO" toLabel="san francisco" stay="1 month" accent={IGNITION} />
        <p className="mt-4 text-[14px] leading-[22px] text-[#1f1f1f]">flights and housing in san francisco, for the full month.</p>
      </Panel>
      <Panel>
        {head("European kickoff", "004")}
        <Ticket to="CEE" toLabel="capital city" stay="2 weeks" accent={INK} />
        <p className="mt-4 text-[14px] leading-[22px] text-[#1f1f1f]">flights and housing in capital city in Central-Eastern Europe, for the full two weeks.</p>
      </Panel>
    </section>
  );
}

// ── past jumpers ────────────────────────────────────────────────────────────
function MPastJumpers() {
  const jumpers = useJumpers();
  const startups = useMemo(() => jumpers.data ?? [], [jumpers.data]);
  const COUNT = startups.length;
  const row = useRowIndex(265);
  const go = (d: number) => row.ref.current?.scrollBy({ left: d * 265, behavior: "smooth" });
  return (
    <section id="past" className="scroll-mt-16">
      <Panel className="px-0">
        <div className="flex items-center px-5">
          <Sub className="text-[22px] leading-7">past jumpers</Sub>
          {COUNT > 0 && <span className={cn("ml-auto text-[13px] tabular-nums", COUNT > 1 && "mr-3.5")} style={{ color: INK66 }}>{String(Math.min(row.i + 1, COUNT)).padStart(2, "0")} / {String(COUNT).padStart(2, "0")}</span>}
          {COUNT > 1 && [-1, 1].map((d) => (
            <button key={d} type="button" aria-label={d < 0 ? "Previous startups" : "Next startups"} onClick={() => go(d)} className="ml-px flex size-10 items-center justify-center" style={{ background: INK80 }}>
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden><path d={d < 0 ? "M10 4L6 8l4 4" : "M6 4l4 4-4 4"} stroke={DUNE} strokeWidth={1.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          ))}
        </div>
        <p className="mt-2 px-5 text-[13px] leading-[21px]" style={{ color: INK66 }}>15 teams from jump 001, and what they build now.</p>
        <div ref={row.ref} aria-busy={jumpers.isPending || undefined} className={cn(rowCls, "mt-6 px-5")}>
          {!jumpers.isPending && startups.length === 0 && <p className="py-10 text-[13px] leading-[21px]" style={{ color: INK80 }}>the past jumpers go up here soon.</p>}
          {jumpers.isPending
            ? Array.from({ length: 2 }, (_, i) => <StartupTileSkeleton key={i} className="snap-start" />)
            : startups.map((st, i) => <StartupTile key={st.id} s={st} n={i + 1} className="snap-start" />)}
          <span aria-hidden className="w-2 shrink-0" />
        </div>
        {COUNT > 1 && (
          <div className="mx-5 mt-5 h-[3px]" style={{ background: SOFT }}>
            <div className="h-full bg-[#1f1f1f]" style={{ width: `${100 / COUNT}%`, marginLeft: `${row.p * (100 - 100 / COUNT)}%` }} />
          </div>
        )}
      </Panel>
    </section>
  );
}

// ── pit crew ────────────────────────────────────────────────────────────────
function MPitCrew() {
  const photos = useCrewPhotos();
  return (
    <section id="crew" className="scroll-mt-16 space-y-2">
      <Panel>
        <Tag label="pit crew" />
        <Title>Your pit crew, available at all times.</Title>
        <p className="mt-4 text-[17px] leading-6" style={{ color: INK80 }}>founders and operators who work with you, not just advise you.</p>
      </Panel>
      {STATIONS.map((st) => (
        <Panel key={st.key} id={`crew-${st.key}`}>
          <Sub className="text-[24px] leading-[30px]">{st.name}</Sub>
          <p className="mt-1.5 text-[13px] leading-[21px]" style={{ color: INK66 }}>{st.covers}</p>
          <div className="mt-5 space-y-4 p-2">
            {st.crew.map((m) => <CrewCard key={m.name} m={m} photos={photos} />)}
          </div>
        </Panel>
      ))}
    </section>
  );
}

// ── faq ─────────────────────────────────────────────────────────────────────
function MFaq() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="scroll-mt-16">
      <Panel>
        <Tag label="faq" />
        <Title>Frequently Asked Questions</Title>
        <p className="mt-3 text-[13px] leading-[21px] text-[#1f1f1f]">still have questions? ask the team.</p>
        <a href={CONTACT_HREF} className="mt-4 flex h-[45px] items-center justify-center text-[13px] leading-[21px] font-medium text-[#1f1f1f]/80" style={{ background: MIST, clipPath: chamfer(16) }}>contact us</a>
        <div className="relative -mx-1 mt-6 space-y-2 p-2" style={{ background: MIST }}>
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: PATTERN.hatch("#2e2e2e") }} />
          {FAQS.map(([q, a], i) => {
            const isOpen = open === i;
            return (
              <div key={q} className="relative" style={{ background: DUNE }}>
                <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? -1 : i)} className="flex w-full items-start justify-between gap-4 px-5 py-5 text-left">
                  <span className={cn(display, "text-[16px] leading-[22px] text-[#1f1f1f]")}>{q}</span>
                  <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full transition-colors", isOpen ? "bg-[#262626]" : "bg-[#e0dedb]")}>
                    <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
                      <path d="M2 6h8" stroke={isOpen ? DUNE : INK} strokeWidth={1.4} strokeLinecap="round" />
                      <path d="M6 2v8" stroke={INK} strokeWidth={1.4} strokeLinecap="round" className={cn("origin-center transition-transform duration-300", isOpen && "scale-y-0")} />
                    </svg>
                  </span>
                </button>
                <div className={cn("grid transition-[grid-template-rows] duration-300 ease-out", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                  <div className="min-h-0 overflow-hidden"><p className="px-5 pb-6 text-[13px] leading-[21px]" style={{ color: INK80 }}>{a}</p></div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </section>
  );
}

// ── footer ──────────────────────────────────────────────────────────────────
function MFooter({ shipUrl, shipTone }: { shipUrl: string; shipTone?: number }) {
  return (
    <footer className="border-t bg-[#1f1f1f]" style={{ borderColor: LINE }}>
      <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex h-16 w-full items-center gap-3 border-b px-5 text-[13px] font-normal text-[#bbbbb5]" style={{ borderColor: LINE }}>
        <svg viewBox="0 0 16 16" className="size-4 opacity-50" aria-hidden><path d="M4 8l4-4 4 4M4 13l4-4 4 4" stroke={STONE} strokeWidth={1.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        back to top
      </button>
      <div className="px-5 pt-8">
        <Tag label="jump 002 is open" onDark />
        <h2 className={cn(display, "mt-6 text-[38px] leading-[44px] tracking-[-0.03em]")}><span className="text-[#f5f3f0]">Reach escape velocity. </span><span className="text-[#bbbbb5]">apply today.</span></h2>
        <p className="mt-5 text-[15px] leading-6">$75K investment, a pit crew that works with you, two weeks in cee and a month in San Francisco. flights and housing included.</p>
        <JumpLink to="/sign-in" className="mt-7 flex h-[53px] w-full items-center justify-center text-[15px] leading-[21px] font-semibold text-[#1f1f1f] opacity-90 active:opacity-100" style={{ background: MIST, clipPath: chamfer(16), ...ORBITRON }}>apply to jump 02</JumpLink>
      </div>
      <div className="relative mt-10 h-[170px] overflow-hidden border-y" style={{ borderColor: LINE }}>
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: PATTERN.dots(MIST) }} />
        <Ill name="vortex" w={270} h={141} style={{ left: "50%", top: 14, marginLeft: -135 }} />
      </div>
      <div className="grid grid-cols-2 gap-5 px-5 pt-8">
        {([["pages", PAGES], ["elsewhere", ELSEWHERE]] as const).map(([title, items]) => (
          <div key={title}>
            <p className={cn(display, "text-[16px] leading-6 text-[#f5f3f0]")}>{title}</p>
            <ul className="mt-5">
              {items.map(([label, href], k) => (
                <li key={label} className="border-b py-2" style={{ borderColor: LINE }}>
                  <a href={href} className={cn(display, "text-[16px] leading-6", k === 0 ? "text-[#f5f3f0]" : "text-[#bbbbb5]")}>{label}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="relative mx-3 mt-10 overflow-hidden px-5 pb-7 pt-6" style={{ background: IGNITION, clipPath: chamferAll(12) }}>
        <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: PATTERN.hatch("#1c1c1c") }} />
        <Arrival model={shipUrl} tone={shipTone} x="68%" y={52} size={112} from={420} trail={230} />
        <img src="/landing/el/hj-mark.svg" alt="" width={45} height={66} className="relative" />
        <p className={cn(display, "relative mt-7 text-[22px] leading-[28px] tracking-[-0.03em] text-[#f5f3f0]")}>your chance to build at the frontier.</p>
        {/* wordmark with its purple halftone, scaled together */}
        <div className="relative mt-7 w-full" style={{ aspectRatio: "1057 / 104" }}>
          <img src="/landing/el/wordmark.svg" alt="" className="absolute inset-0 size-full" />
          <img src="/landing/el/wordmark-halftone.png" alt="" className="absolute max-w-none" style={{ left: "-3.406%", top: "-159.6%", width: "107.85%", height: "294.2%" } as CSSProperties} />
        </div>
      </div>
      <div className="mt-6 border-t px-5 py-6 text-[13px] leading-[21px]" style={{ borderColor: LINE }}>
        <p className="text-[#f5f3f0]">© hyperjump 2026</p>
        <p className="mt-3 flex flex-wrap gap-x-6 gap-y-1"><span className="text-[#f5f3f0]">all rights reserved</span><a href="#" className="text-[#bbbbb5]">terms of use</a><a href="#" className="text-[#bbbbb5]">privacy policy</a></p>
      </div>
    </footer>
  );
}
