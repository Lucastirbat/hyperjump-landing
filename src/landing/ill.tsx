import { useEffect, useRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import "./landing.css";

/*
 * Inline SVG illustrations (exported from the Figma frame) so their parts can be animated in CSS.
 * Each shape gets its index as --i for staggering; stroked shapes get pathLength=1 so they can draw in.
 * The entrance plays once when the illustration scrolls into view; the idle loops live in landing.css.
 */
const SVGS = import.meta.glob<string>("./el/*.svg", { query: "?raw", import: "default", eager: true });
const svg = (name: string) => SVGS[`./el/${name}.svg`] ?? "";

export type IllName = "olympiads" | "prototypes" | "depth" | "curiosity" | "agency" | "intelligence" | "growth" | "profiles" | "ground" | "stars" | "tag-graph" | "vortex";

export function Ill({ name, w, h, className, style }: { name: IllName; w: number; h: number; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.querySelectorAll<SVGGeometryElement>("path, circle, ellipse, line, polyline, rect").forEach((p, i) => {
      p.style.setProperty("--i", String(i));
      const stroked = p.getAttribute("stroke") && p.getAttribute("stroke") !== "none";
      if (stroked && !p.hasAttribute("stroke-dasharray")) { p.setAttribute("pathLength", "1"); p.classList.add("hj-draw"); }
    });
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.classList.add("hj-ill--armed");
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { el.classList.add("is-in"); io.disconnect(); } }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <span ref={ref} aria-hidden className={cn("hj-ill", `hj-ill--${name}`, className)} style={{ width: w, height: h, ...style }} dangerouslySetInnerHTML={{ __html: svg(name) }} />;
}
