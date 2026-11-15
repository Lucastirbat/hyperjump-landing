import { useEffect, useRef, useState } from "react";

/*
 * Crosshair cursor (desktop, mouse only): a hairline on the X and Y axes through the pointer, and a small
 * bracket reticle in place of the system cursor (the same corner brackets as the page's frames).
 * Everything blends with `difference`, so it reads on the dark sections and the light panels alike.
 * Over a button or link the brackets leave the pointer and frame the element itself (its four corners);
 * over other controls they just open up. On press they close in. Touch and pen keep their cursor.
 */
export function Crosshair() {
  const [on] = useState(() => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  const root = useRef<HTMLDivElement>(null);
  const h = useRef<HTMLDivElement>(null);
  const v = useRef<HTMLDivElement>(null);
  const r = useRef<HTMLDivElement>(null);
  const f = useRef<HTMLDivElement>(null); // the frame around a hovered button: pinned to the element, not the pointer

  useEffect(() => {
    const el = root.current;
    if (!on || !el) return;
    const html = document.documentElement;
    let x = 0, y = 0, raf = 0;
    let target: Element | null = null; // the button or link being framed
    const PAD = 5, MAX_W = 560, MAX_H = 120; // big tiles and cards keep the plain reticle
    const frameable = (t: Element | null) => {
      const el = t?.closest?.('a, button, [role="button"]') ?? null;
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return b.width > 0 && b.width <= MAX_W && b.height <= MAX_H ? el : null;
    };
    const draw = () => {
      raf = 0;
      h.current!.style.transform = `translate3d(0, ${y}px, 0)`;
      v.current!.style.transform = `translate3d(${x}px, 0, 0)`;
      r.current!.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (target) {
        // the frame sits on the element's own box, so it stays still while the pointer moves inside it
        const b = target.getBoundingClientRect(), fr = f.current!;
        fr.style.transform = `translate3d(${b.left - PAD}px, ${b.top - PAD}px, 0)`;
        fr.style.width = `${b.width + PAD * 2}px`;
        fr.style.height = `${b.height + PAD * 2}px`;
        el.dataset.frame = "";
      } else delete el.dataset.frame;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") { delete el.dataset.on; html.classList.remove("hj-crosshair"); return; }
      x = e.clientX; y = e.clientY;
      el.dataset.on = "";
      html.classList.add("hj-crosshair"); // hide the system cursor only once ours is drawn
      const hot = (e.target as Element | null)?.closest?.('a, button, [role="button"], [role="slider"], summary, label, input, select, textarea');
      const next = frameable(e.target as Element | null);
      if (next !== target) { target = next; if (!raf) raf = requestAnimationFrame(draw); }
      if (hot && !target) el.dataset.hot = ""; else delete el.dataset.hot;
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const leave = () => { delete el.dataset.on; target = null; delete el.dataset.frame; };
    // the page can scroll under a still pointer: keep the frame on its element
    const scroll = () => { if (target && !raf) raf = requestAnimationFrame(draw); };
    const down = () => { el.dataset.down = ""; };
    const up = () => { delete el.dataset.down; };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    html.addEventListener("pointerleave", leave);
    window.addEventListener("blur", leave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      html.removeEventListener("pointerleave", leave);
      window.removeEventListener("blur", leave);
      html.classList.remove("hj-crosshair");
    };
  }, [on]);

  if (!on) return null;
  return (
    <div ref={root} aria-hidden className="hj-xhair">
      <div ref={h} className="hj-xhair-h" />
      <div ref={v} className="hj-xhair-v" />
      <div ref={r} className="hj-xhair-r">
        <span className="tl" /><span className="tr" /><span className="bl" /><span className="br" />
        <i />
      </div>
      <div ref={f} className="hj-xhair-f">
        <span className="tl" /><span className="tr" /><span className="bl" /><span className="br" />
      </div>
    </div>
  );
}
