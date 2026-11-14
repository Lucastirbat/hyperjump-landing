import "@fontsource-variable/orbitron";
import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type MutableRefObject } from "react";
import { cn } from "@/lib/utils";
import { JumpLink } from "@/components/hyperspace";
import { Crosshair } from "@/components/crosshair";
import type { Tip } from "./ship-scene";
import { EXPONENTIAL_HREF, HERO_SUB, HERO_TITLE, STEPS, TIPS } from "./content";
import { Footer, Middle } from "./sections";
import { LandingMobile } from "./mobile";
import { Box, chamfer, chamferAll, Corners, DUNE, Frame, IGNITION, IconMail, IconSearch, IconShare, IconShield, INK, LINE, MIST, ORBITRON, PATTERN, Row, TagStrip, display } from "./parts";

const ShipScene = lazy(() => import("./ship-scene"));

/*
 * Landing page, built from Figma "Landing / Desktop 1440 · v5 dispatch replica (exact)".
 * Geometry is the frame's 1440 grid: rails at 40–220, content 260–1400 split 260–810 | 850–1400.
 * Rows (frame y): header 0–60 (fixed), hero 0–871, overview 871–1644, banner 1644–1916,
 * then the middle sections and the footer (sections.tsx).
 */
const HERO_H = 871;

/** Ships in rotation (public/models/ships). Each page load shows the next one. `tone` (0..1) darkens a bright paint job. */
type Ship = { url: string; tone?: number };
const SHIPS: Ship[] = [
  { url: "/models/ships/ship-01.glb" },
  { url: "/models/ships/ship-02.glb", tone: 0.72 }, // white hull: reads too bright under the scene's lights
  { url: "/models/ships/ship-03.glb", tone: 0.72 }, // white and lilac (3dmodelship): same reason
  { url: "/models/ships/ship-04.glb" },
];

/** Next ship in the rotation, remembered per browser so every load is a different ship. Chosen once per page load. */
let chosenShip: Ship | null = null;
function nextShip() {
  if (chosenShip) return chosenShip;
  chosenShip = pickShip();
  return chosenShip;
}
function pickShip() {
  try {
    const last = Number(localStorage.getItem("hj-ship") ?? -1);
    const i = (Number.isFinite(last) ? last + 1 : 0) % SHIPS.length;
    localStorage.setItem("hj-ship", String(i));
    return SHIPS[i]!;
  } catch {
    return SHIPS[Math.floor(Math.random() * SHIPS.length)]!; // storage blocked: random is the next best thing
  }
}

/** How long the page holds still after the first scroll, while the ship drops out of hyperspace. */
const LAUNCH_LOCK_MS = 1000;
const SCROLL_KEYS = new Set([" ", "PageDown", "ArrowDown", "End", "Down"]);

/**
 * Brief scroll lock: the first scroll attempt launches the ship instead of moving the page, and the
 * page stays put for LAUNCH_LOCK_MS. Once only, and only when the page loads at the top.
 */
function useLaunchLock(launched: MutableRefObject<boolean>, disabled: boolean, skip = false) {
  useEffect(() => {
    if (skip) return; // the mobile layout launches the ship itself, when its stage is on screen
    if (disabled || window.scrollY > 0) { launched.current = true; return; }
    let state: "idle" | "locked" | "done" = "idle";
    let timer = 0;
    const launch = () => {
      launched.current = true;
      state = "locked";
      timer = window.setTimeout(() => { state = "done"; }, LAUNCH_LOCK_MS);
    };
    const block = (e: Event) => {
      if (state === "done") return;
      e.preventDefault();
      if (document.documentElement.classList.contains("hj-booting")) return; // preloader up: launch once it's gone
      if (state === "idle") launch();
    };
    const onWheel = (e: WheelEvent) => { if (e.deltaY > 0 || state === "locked") block(e); };
    const onKey = (e: KeyboardEvent) => {
      if (state === "done" || !SCROLL_KEYS.has(e.key)) return;
      if ((e.target as HTMLElement | null)?.closest("input, textarea, select, button, a, [contenteditable]")) return;
      block(e);
    };
    // Scrollbar drags and anything else that moves the page: launch, and hold at the top while locked.
    const onScroll = () => {
      if (state === "done" || window.scrollY === 0) return;
      if (state === "idle") launch();
      window.scrollTo(0, 0);
    };
    // Jumping to a section via an in-page link is deliberate: launch, but don't hold the page.
    const onClick = (e: MouseEvent) => {
      if (state === "done" || !(e.target as HTMLElement | null)?.closest('a[href^="#"]')) return;
      launched.current = true; state = "done"; window.clearTimeout(timer);
    };
    window.addEventListener("click", onClick, true);
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchmove", block, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchmove", block);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, [launched, disabled, skip]);
}

function useMedia(query: string) {
  const [match, setMatch] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
}

export function LandingPage() {
  const reducedMotion = useMedia("(prefers-reduced-motion: reduce)");
  const progress = useRef(0);
  const tipEls = useRef<(HTMLDivElement | null)[]>([]);
  const launched = useRef(false);
  const [ship] = useState(nextShip);
  // Below 1024px the page switches to the one-column mobile layout (Figma "Landing / Mobile 390").
  const mobile = useMedia("(max-width: 1023px)");
  useLaunchLock(launched, reducedMotion, mobile);
  const scale = useDesktopScale();

  useEffect(() => {
    document.title = "hyperjump";
    const onScroll = () => { progress.current = Math.min(1, window.scrollY / HERO_H); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (mobile) {
    return (
      <div className="hj-landing min-h-dvh overflow-x-clip bg-[#262626] font-light text-[#bbbbb5]">
        <LandingMobile ship={ship} progress={progress} launched={launched} tipEls={tipEls} reducedMotion={reducedMotion} />
      </div>
    );
  }

  // 1024–1439px windows: the whole 1440 design is scaled down with CSS zoom so it fits, exactly as
  // designed. The ship's WebGL canvas can't live inside a zoomed box (its size and tooltip maths
  // would be scaled twice), so it sits outside, under the page, sized to the scaled hero.
  return (
    <div className="hj-landing relative min-h-dvh overflow-x-clip bg-[#262626] font-light text-[#bbbbb5]">
      <ShipLayer
        ship={ship} progress={progress} launched={launched} tipEls={tipEls} reducedMotion={reducedMotion} scale={scale}
        style={{ top: 60 * scale, height: (HERO_H - 60) * scale, left: `max(${850 * scale}px, calc(50% + ${130 * scale}px))` }}
      />
      <div className="pointer-events-none relative [&>*]:pointer-events-auto" style={{ zoom: scale }}>
        <Header />
        <Hero />
        <Overview />
        <Banner />
        <Middle shipUrl={ship.url} shipTone={ship.tone} />
        <Footer shipUrl={ship.url} shipTone={ship.tone} />
      </div>
      <Crosshair />
    </div>
  );
}

/** Zoom factor for the 1440 desktop design: 1 from 1440px up, down to 1024/1440 at the mobile breakpoint. */
function useDesktopScale() {
  const get = () => (typeof window === "undefined" ? 1 : Math.min(1, Math.max(1024, window.innerWidth) / 1440));
  const [scale, setScale] = useState(get);
  useEffect(() => {
    const on = () => setScale(get());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return scale;
}

// ── header ──────────────────────────────────────────────────────────────────
function Header() {
  // No "sign in": everyone comes in through apply.
  const nav = [
    { label: "what you get", x: 866, active: true, href: "#get" },
    { label: "pit crew", x: 975, href: "#crew" },
    { label: "past jumpers", x: 1056, href: "#past" },
    { label: "faq", x: 1167, href: "#faq" },
  ];
  return (
    <header className="fixed inset-x-0 top-0 z-50 h-[60px] border-b backdrop-blur-[8px]" style={{ borderColor: LINE, background: "rgba(37,36,34,0.8)" }}>
      <div className="relative mx-auto h-full w-[1440px]">
        <a href="/" aria-label="HyperJump home" className="absolute left-10 top-0 flex h-[60px] w-[180px] items-center justify-center border-x" style={{ background: IGNITION, borderColor: LINE }}>
          <img src="/landing/el/wordmark.svg" alt="" width={144} height={14} className="block" />
        </a>
        {/* Chamfered foot of the logo tile, with the dot screen over it. */}
        <div aria-hidden className="absolute left-10 top-[60px] h-4 w-[180px]" style={{ background: IGNITION, clipPath: "polygon(0 0, 100% 0, calc(100% - 16px) 100%, 16px 100%)" }}>
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: PATTERN.dots("#262626") }} />
        </div>
        {nav.map((n) => (
          <a key={n.label} href={n.href} className={cn("absolute top-5 text-[13px] leading-[21px] transition-colors hover:text-[#f5f3f0]", n.active ? "text-[#f5f3f0]" : "text-[#bbbbb5]")} style={{ left: n.x }}>{n.label}</a>
        ))}
        <JumpLink to="/sign-in" className="absolute left-[1243px] top-0 flex h-[59px] w-[157px] items-center justify-center text-[22px] leading-[21px] font-black text-white opacity-90 transition-opacity hover:opacity-100" style={{ background: IGNITION, ...ORBITRON }}>
          apply
        </JumpLink>
      </div>
    </header>
  );
}

// ── hero ────────────────────────────────────────────────────────────────────
function Hero() {
  const line = { borderColor: LINE } as const;
  const inner = HERO_H - 60;
  return (
    <Row height={HERO_H} className="border-b" style={{ ...line, pointerEvents: "none" }} passThrough>
      <Box x={40} y={60} w={180} h={inner} className="border-x" style={line} />
      <Box x={260} y={60} w={550} h={inner} className="border-x" style={line} />
      <Box x={850} y={60} w={550} h={inner} className="pointer-events-none border-l" style={line} />

      {/* Headline block, centred in the column */}
      <TagStrip x={296} y={229} w={478} label="jump 002, applications open" />
      <Box x={296} y={309} w={478} as="h1" className={cn(display, "pointer-events-auto text-[72px] leading-[72px] tracking-[-0.03em] text-white")}>
        {HERO_TITLE[0]}<br />{HERO_TITLE[1]}
      </Box>
      <Box x={296} y={541} w={478} as="p" className="pointer-events-auto text-[15px] leading-6">
        {HERO_SUB[0]}<br />{HERO_SUB[1]}
      </Box>
      <JumpLink to="/sign-in" className="pointer-events-auto absolute left-[296px] top-[649px] flex h-[53px] w-[222px] items-center justify-center text-[16px] leading-[21px] font-bold text-[#1f1f1f] opacity-90 transition-opacity hover:opacity-100" style={{ background: MIST, clipPath: chamfer(16), ...ORBITRON }}>
        apply to jump 02
      </JumpLink>
    </Row>
  );
}

/** The ship's stage: from the right panel's left line (grid x 850) to the window's right edge. */
function ShipLayer({ ship, progress, launched, tipEls, reducedMotion, style, scale }: { ship: Ship; progress: MutableRefObject<number>; launched: MutableRefObject<boolean>; tipEls: MutableRefObject<(HTMLDivElement | null)[]>; reducedMotion: boolean; style: CSSProperties; scale: number }) {
  return (
    <div className="absolute right-0" style={style}>
      <Suspense fallback={null}>
        <ShipScene model={ship.url} tone={ship.tone} progress={progress} launched={launched} tips={TIPS} tipEls={tipEls} reducedMotion={reducedMotion} />
      </Suspense>
      <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
        {TIPS.map((tip, i) => (
          <div key={tip.anchor} ref={(el) => { tipEls.current[i] = el; }} className="absolute left-0 top-0 opacity-0 will-change-transform">
            {/* cards shrink with the rest of the scaled layout, pinned at their anchor */}
            <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0" }}><TipCard tip={tip} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TipCard({ tip }: { tip: Tip }) {
  const left = tip.dx < 0;
  return (
    <div className="relative size-0">
      <span className="absolute -left-[4px] -top-[4px] size-2 rounded-full bg-[#9999FF] shadow-[0_0_12px_2px_rgba(153,153,255,0.7)]" />
      <svg className="absolute left-0 top-0 overflow-visible" width={1} height={1}>
        <line x1={0} y1={0} x2={tip.dx} y2={tip.dy} stroke="rgba(153,153,255,0.55)" strokeWidth={1} />
      </svg>
      <div className="absolute w-[200px] -translate-y-1/2 border bg-[#1f1f1f]/85 px-3 py-2.5 backdrop-blur-md" style={{ borderColor: "rgba(187,187,181,0.18)", ...(left ? { right: Math.abs(tip.dx), top: tip.dy, textAlign: "right" } : { left: tip.dx, top: tip.dy }) }}>
        <p className={cn(display, "text-[14px] leading-5 text-[#f5f3f0]")}>{tip.title}</p>
        <p className="mt-0.5 text-[12px] leading-[17px] text-[#bbbbb5]">{tip.body}</p>
      </div>
    </div>
  );
}

// ── overview ────────────────────────────────────────────────────────────────
const OVERVIEW_H = 773;
const W = "text-white", D = "text-[#f5f3f0]";

function Overview() {
  const line = { borderColor: LINE } as const;
  const stepIcons = [<IconSearch key="s" />, <IconShield key="sh" />, <IconShare key="u" />, <IconMail key="m" />];
  return (
    <Row
      height={OVERVIEW_H}
      className="border-b bg-[#1f1f1f]"
      style={line}
      backdrop={
        // Edge-to-edge band lines: drawn at the window's width, never wider (no sideways scroll).
        <>
          <div className="absolute inset-x-0 top-[80px] h-px" style={{ background: LINE }} />
          <div className="absolute inset-x-0 top-[692px] h-px" style={{ background: LINE }} />
        </>
      }
    >
      <Frame top={0} height={80} />
      <Frame top={80} height={613} />
      <Frame top={693} height={80} />

      <TagStrip x={296} y={116} w={514} label="overview" />
      <Box x={296} y={252} w={514} as="p" className={cn(display, "text-[28px] leading-[35px] tracking-[-0.03em]")}>
        hyperjump is an <span className={D}>accelerator</span> <span className={W}>for builders</span> <span className={W}>under 26 </span>from central and eastern europe.
      </Box>
      <Box x={296} y={397} w={514} as="p" className={cn(display, "text-[28px] leading-[35px] tracking-[-0.03em]")}>
        <span className={D}>We invest</span> in your company, provide a team of <span className={D}>experienced operators</span>, and give you the <span className={D}>time, money and network to</span> build something serious, <span className={D}>years earlier than you’ve planned.</span>
      </Box>

      {/* how to join */}
      <Box x={850} y={116} w={514} h={541} className="border bg-[#1f1f1f]" style={{ borderColor: "rgba(187,187,181,0.1)" }}>
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: PATTERN.hatchBack(DUNE) }} />
        <Corners />
        <span className="absolute left-10 top-10 text-[13px] leading-[21px] text-[#f5f3f0]">How to join</span>
        <span className="absolute left-[155px] top-[50px] h-px w-[185px]" style={{ background: "rgba(187,187,181,0.66)" }} />
        {STEPS.map((label, i) => (
          <div key={label}>
            <div className="absolute left-10 h-[70px] w-[434px] border bg-[#1f1f1f]" style={{ top: 101 + i * 110, borderColor: LINE }}>
              <Corners />
              <span className="absolute left-6 top-6 text-[13px] leading-[21px] text-[#bbbbb5]/65">{String(i + 1).padStart(2, "0")}</span>
              <span className="absolute inset-x-0 top-[25px] text-center text-[13px] leading-[21px]">{label}</span>
              <span className="absolute right-6 top-6 size-[21px]">{stepIcons[i]}</span>
            </div>
            {i < STEPS.length - 1 && (
              <svg viewBox="0 0 24 24" className="absolute size-6" style={{ left: 245, top: 179 + i * 110 }} aria-hidden>
                <path d="M12 21V3M12 21l-7-7M12 21l7-7" fill="none" stroke="#f0e7da" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        ))}
      </Box>
    </Row>
  );
}

// ── powered by exponential ──────────────────────────────────────────────────

function Banner() {
  const line = { borderColor: LINE } as const;
  return (
    <Row
      height={272}
      backdrop={<>{[0, 271].map((y) => <div key={y} className="absolute inset-x-0 h-px" style={{ top: y, background: LINE }} />)}</>}
    >
      <Box x={40} y={0} w={180} h={272} className="border-x" style={line} />
      <Box x={260} y={0} w={1140} h={272} className="border-x" style={line} />
      <div className="absolute left-[260px] top-0 h-[272px] w-[1140px]" style={{ background: DUNE, clipPath: chamferAll(16) }} />
      <TagStrip x={296} y={36} w={1068} label="powered by exponential" dark solid />
      <Box x={296} y={116} w={780} as="p" className={cn(display, "text-[32px] leading-10 tracking-[-0.03em]")}>
        <span className="text-[#666666]">we’re part of exponential, a venture capital fund based in san francisco investing in startups. </span>
        <span style={{ color: INK }}>hyperjump is the first step for founders who want to grow with us.</span>
      </Box>
      <img src="/landing/el/exponential.svg" alt="exponential" width={207} height={69} className="absolute left-[1157px] top-[102px]" />
      <a href={EXPONENTIAL_HREF} className="absolute left-[1151px] top-[191px] flex h-[45px] w-[213px] items-center justify-center text-[13px] leading-[21px] font-medium text-[#f5f3f0] opacity-90 transition-opacity hover:opacity-100" style={{ background: "#262626", clipPath: chamfer(16) }}>
        read more
      </a>
    </Row>
  );
}
