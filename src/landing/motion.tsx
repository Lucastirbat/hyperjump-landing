import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import goldenGate from "../../public/landing/el/golden-gate.svg?raw";

/*
 * Small one-off motions that play when their element scrolls into view, once. Reduced motion: the final
 * state, straight away.
 */

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Calls `onEnter` once, the first time the element is mostly on screen. */
function useOnce<T extends Element>(onEnter: () => void, threshold = 0.6) {
  const ref = useRef<T>(null);
  const fn = useRef(onEnter); fn.current = onEnter;
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { io.disconnect(); fn.current(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return ref;
}

/**
 * A number that counts up from 0 when it comes into view. The final text holds the space (invisible), so
 * nothing around it shifts while the digits change.
 */
export function CountUp({ to, prefix = "", suffix = "", ms = 1100 }: { to: number; prefix?: string; suffix?: string; ms?: number }) {
  const [v, setV] = useState(() => (reduced() ? to : 0));
  const ref = useOnce<HTMLSpanElement>(() => {
    if (reduced()) return;
    const start = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / ms);
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  return (
    <span ref={ref} className="relative inline-block whitespace-nowrap" aria-label={`${prefix}${to}${suffix}`}>
      <span aria-hidden className="invisible">{prefix}{to}{suffix}</span>
      <span aria-hidden className="absolute left-0 top-0">{prefix}{v}{suffix}</span>
    </span>
  );
}

/**
 * The San Francisco tile's line drawing, drawn in once: strokes sweep in from left to right (towers and
 * deck first, then the cables and hangers), and the purple dot on the pyramid lights up last.
 */
export function GoldenGate({ className }: { className?: string }) {
  const ref = useOnce<HTMLDivElement>(() => ref.current?.classList.add("is-on"), 0.4);
  useLayoutEffect(() => {
    const svg = ref.current?.querySelector("svg"); if (!svg) return;
    const W = 1084;
    svg.querySelectorAll<SVGGeometryElement>("line, path").forEach((el) => {
      el.setAttribute("pathLength", "1");
      // left-to-right sweep: each stroke starts by where it begins on the drawing
      const box = el.getBBox();
      el.style.setProperty("--d", `${Math.round((box.x / W) * 900)}ms`);
    });
    if (reduced()) ref.current?.classList.add("is-on");
  }, [ref]);
  return <div ref={ref} aria-hidden className={cn("hj-gg", className)} dangerouslySetInnerHTML={{ __html: goldenGate }} />;
}
