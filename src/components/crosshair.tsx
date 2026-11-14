import { useEffect, useRef, useState } from "react";

/*
 * Crosshair cursor (desktop, mouse only): a hairline on the X and Y axes through the pointer, and a small
 * bracket reticle in place of the system cursor (the same corner brackets as the page's frames).
 * Everything blends with `difference`, so it reads on the dark sections and the light panels alike.
 * Over links and buttons the brackets open up; on press they close in. Touch and pen keep their cursor.
 */
export function Crosshair() {
  const [on] = useState(() => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  const root = useRef<HTMLDivElement>(null);
  const h = useRef<HTMLDivElement>(null);
  const v = useRef<HTMLDivElement>(null);
  const r = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!on || !el) return;
    const html = document.documentElement;
    let x = 0, y = 0, raf = 0;
    const draw = () => {
      raf = 0;
      h.current!.style.transform = `translate3d(0, ${y}px, 0)`;
      v.current!.style.transform = `translate3d(${x}px, 0, 0)`;
      r.current!.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") { delete el.dataset.on; html.classList.remove("hj-crosshair"); return; }
      x = e.clientX; y = e.clientY;
      el.dataset.on = "";
      html.classList.add("hj-crosshair"); // hide the system cursor only once ours is drawn
      const hot = (e.target as Element | null)?.closest?.('a, button, [role="button"], [role="slider"], summary, label, input, select, textarea');
      if (hot) el.dataset.hot = ""; else delete el.dataset.hot;
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const leave = () => { delete el.dataset.on; };
    const down = () => { el.dataset.down = ""; };
    const up = () => { delete el.dataset.down; };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    html.addEventListener("pointerleave", leave);
    window.addEventListener("blur", leave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
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
    </div>
  );
}
