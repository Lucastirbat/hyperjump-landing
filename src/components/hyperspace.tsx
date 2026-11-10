import { createContext, useCallback, useContext, useEffect, useRef, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode, type RefObject } from "react";
import { APP_URL, SIGN_IN_URL } from "@/lib/config";

/*
 * First-person hyperspace jump from the landing page into the platform's sign-in page.
 *
 * `jump(url)` plays the sequence: the page you leave rushes past (grows, blurs, fades) as stars stretch
 * into streaks and a soft purple bloom opens at the vanishing point. At peak speed the browser goes to
 * the platform, and the warp holds there until the next page replaces this one. The platform sees
 * `?jump=1` and plays the drop-out of hyperspace, so the two halves join up.
 * Reduced motion: no animation, plain navigation.
 */

const JumpCtx = createContext<(url: string) => void>(() => {});
export const useHyperjump = () => useContext(JumpCtx);

const prefersReduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Platform URL for a path on the platform ("/sign-in" gets the jump flag). */
export const platformUrl = (to: string) => (to === "/sign-in" ? SIGN_IN_URL : new URL(to, `${APP_URL}/`).href);

export function HyperspaceProvider({ children }: { children: ReactNode }) {
  const [run, setRun] = useState<{ id: number; url: string } | null>(null);
  const jumping = useRef(false);
  const stage = useRef<HTMLDivElement>(null);

  const jump = useCallback((url: string) => {
    if (prefersReduced()) { window.location.assign(url); return; }
    if (jumping.current) return;
    jumping.current = true;
    setRun({ id: Date.now(), url });
  }, []);

  // Back button after a jump: the browser may restore this page from its cache mid-warp. Start clean.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) { jumping.current = false; setRun(null); } };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  return (
    <JumpCtx.Provider value={jump}>
      <div ref={stage}>{children}</div>
      {run && <Warp key={run.id} stage={stage} onPeak={() => window.location.assign(run.url)} />}
    </JumpCtx.Provider>
  );
}

/** A link to the platform that jumps through hyperspace instead of navigating straight away (plain clicks only). */
export function JumpLink({ to, onClick, ...rest }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { to: string }) {
  const jump = useHyperjump();
  const url = platformUrl(to);
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    jump(url);
  };
  return <a href={url} onClick={handle} {...rest} />;
}

// ── the warp ────────────────────────────────────────────────────────────────

/** Timeline in seconds. The warp runs to `peak` and holds there while the next page loads. */
const T = { dim: 0.35, accel: 1.15, bloomIn: 1.0, peak: 1.25, end: 2.15 };
const HOLD = T.peak - 0.001;
const V_MIN = 0.1, V_MAX = 6.5;
const STARS = 900;
const COLORS = ["255,255,255", "255,255,255", "255,255,255", "153,153,255", "100,66,253", "245,243,240"];

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const easeIn = (x: number) => x * x * x;
const easeOut = (x: number) => 1 - (1 - x) ** 3;

/** Speed through the tunnel: crawl, accelerate hard, hold at the bloom, then drop out. */
function speed(t: number) {
  if (t < T.dim) return V_MIN;
  if (t < T.peak) return V_MIN + (V_MAX - V_MIN) * easeIn(seg(t, T.dim, T.accel));
  return V_MIN + (V_MAX - V_MIN) * (1 - easeOut(seg(t, T.peak + 0.05, T.end - 0.1)));
}

function Warp({ stage, onPeak }: { stage: RefObject<HTMLDivElement | null>; onPeak: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const cb = useRef({ onPeak });
  cb.current = { onPeak };

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) { cb.current.onPeak(); return; }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;
    const resize = () => { w = window.innerWidth; h = window.innerHeight; el.width = w * dpr; el.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize();
    window.addEventListener("resize", resize);

    // Stars in a tunnel ahead of the viewer: x, y on the image plane, z = depth (1 far, 0 at the eye).
    const sx = new Float32Array(STARS), sy = new Float32Array(STARS), sz = new Float32Array(STARS), sc = new Uint8Array(STARS);
    const spawn = (i: number, z: number) => {
      const a = Math.random() * Math.PI * 2, r = 0.04 + Math.random() ** 0.7 * 1.25; // keep the very centre clear
      sx[i] = Math.cos(a) * r; sy[i] = Math.sin(a) * r; sz[i] = z; sc[i] = Math.floor(Math.random() * COLORS.length);
    };
    for (let i = 0; i < STARS; i++) spawn(i, 0.05 + Math.random() * 0.95);

    // The page itself moves with the jump: it rushes past you and blurs out.
    const page = stage.current;
    const move = (scale: number, opacity: number, blur: number) => {
      if (!page) return;
      page.style.transformOrigin = `50% ${window.scrollY + window.innerHeight / 2}px`;
      page.style.transform = `scale(${scale})`;
      page.style.opacity = String(opacity);
      page.style.filter = blur > 0.1 ? `blur(${blur.toFixed(2)}px)` : "";
    };
    const release = () => { if (page) { page.style.transform = ""; page.style.opacity = ""; page.style.filter = ""; page.style.transformOrigin = ""; } };

    // Time advances in capped steps, not wall-clock, so a stalled frame never skips the build-up.
    let raf = 0, last = performance.now(), peaked = false;
    let t = 0;

    const frame = (now: number) => {
      const dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      t = Math.min(HOLD, t + dt);
      const v = speed(t);
      const cx = w / 2, cy = h / 2, f = Math.max(w, h) * 0.55;

      // deep space: dims in at the start, clears as the new page arrives
      const bg = Math.min(seg(t, 0, T.dim), 1 - easeOut(seg(t, T.peak + 0.1, T.end - 0.15)));
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = `rgba(7,6,13,${0.94 * bg})`;
      ctx.fillRect(0, 0, w, h);

      // streaks: draw from where each star was a moment ago to where it is now
      const starA = Math.min(seg(t, 0.05, T.dim + 0.1), 1 - seg(t, T.end - 0.45, T.end));
      const trail = Math.min(0.6, 0.02 + v * 0.07);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      for (let i = 0; i < STARS; i++) {
        sz[i]! -= v * dt * 0.32;
        if (sz[i]! <= 0.01) spawn(i, 1);
        const z = sz[i]!, z0 = Math.min(1, z + trail * z);
        const x1 = cx + (sx[i]! / z) * f, y1 = cy + (sy[i]! / z) * f;
        if (x1 < -50 || x1 > w + 50 || y1 < -50 || y1 > h + 50) { spawn(i, 0.6 + Math.random() * 0.4); continue; }
        const x0 = cx + (sx[i]! / z0) * f, y0 = cy + (sy[i]! / z0) * f;
        const near = 1 - z;
        ctx.strokeStyle = `rgba(${COLORS[sc[i]!]},${(0.25 + near * 0.75) * starA})`;
        ctx.lineWidth = 0.6 + near * near * 2.4;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }

      // the far end of the tunnel glows ignition as you speed up
      const glow = clamp01((v - V_MIN) / (V_MAX - V_MIN)) * starA;
      if (glow > 0.01) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.5);
        g.addColorStop(0, `rgba(153,153,255,${0.55 * glow})`);
        g.addColorStop(0.18, `rgba(100,66,253,${0.28 * glow})`);
        g.addColorStop(1, "rgba(100,66,253,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      // at peak speed a soft bloom opens at the vanishing point (no white-out), then fades as you arrive
      const bloom = Math.min(easeIn(seg(t, T.bloomIn, T.peak)), 1 - easeOut(seg(t, T.peak, T.peak + 0.55)));
      if (bloom > 0.001) {
        const r = Math.max(w, h) * (0.35 + 0.25 * bloom);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, `rgba(214,206,255,${0.55 * bloom})`);
        g.addColorStop(0.25, `rgba(153,153,255,${0.32 * bloom})`);
        g.addColorStop(0.6, `rgba(100,66,253,${0.14 * bloom})`);
        g.addColorStop(1, "rgba(100,66,253,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      // the page you leave grows past you and blurs out
      const k = easeIn(seg(t, 0.1, T.peak));
      move(1 + 0.35 * k, 1 - seg(t, 0.15, 1.0), 7 * k);

      if (!peaked && t >= HOLD) { peaked = true; cb.current.onPeak(); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); release(); };
  }, [stage]);

  return <canvas ref={canvas} aria-hidden className="fixed inset-0 z-[200] h-dvh w-screen" />;
}
