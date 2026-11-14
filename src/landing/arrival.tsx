import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { ArrivalEls } from "./arrival-scene";

const ArrivalScene = lazy(() => import("./arrival-scene"));

/*
 * The footer band's ship: the hero's 3D model from above, dropping out of hyperspace when the band scrolls
 * in. Star streaks rush past, the ship shoots in stretched from the left and brakes to its spot, a flash
 * where it lands, and a three-line trail behind it that shortens as it slows. Once, then it drifts.
 * The motion is CSS (.hj-arrive, landing.css) on an empty marker; the 3D ship (arrival-scene.tsx) reads it
 * every frame, so everything stays in step. Reduced motion: the ship is simply there, trail and all.
 */

type Props = {
  /** The visitor's ship (public/models/ships). */
  model: string;
  tone?: number;
  /** Where the ship rests (its centre): px, or any CSS length for fluid bands. */
  x: number | string;
  y: number;
  /** Ship length on screen, roughly (px). */
  size: number;
  /** How far left it starts (px), and the trail's length at rest. */
  from: number;
  trail: number;
  className?: string;
};

export function Arrival({ model, tone, x, y, size, from, trail, className }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const els = useRef<ArrivalEls>({ box: null, anchor: null, arrive: null });
  const [on, setOn] = useState(false);
  const [near, setNear] = useState({ mounted: false, active: false });
  useEffect(() => {
    const el = box.current; if (!el) return;
    els.current.box = el;
    // play once the band is mostly in view
    const play = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setOn(true); play.disconnect(); } }, { threshold: 0.45 });
    // load the 3D scene a little before that, and pause it when the band is off screen
    const load = new IntersectionObserver(([e]) => setNear((s) => ({ mounted: s.mounted || !!e?.isIntersecting, active: !!e?.isIntersecting })), { rootMargin: "400px 0px" });
    play.observe(el); load.observe(el);
    return () => { play.disconnect(); load.disconnect(); };
  }, []);

  // streaks: a fixed scatter, so every visit looks the same
  const streaks = useMemo(() => {
    let seed = 3;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    return Array.from({ length: 8 }, () => ({ top: `${8 + rnd() * 84}%`, w: 80 + rnd() * 200, delay: rnd() * 260, o: 0.12 + rnd() * 0.22 }));
  }, []);

  const vars = { "--from": `${-from}px`, "--trail": `${trail}px`, "--trail-from": `${trail + from * 0.6}px` } as CSSProperties;
  return (
    <div ref={box} aria-hidden className={cn("hj-arrival pointer-events-none absolute inset-0 overflow-hidden", on && "is-on", className)} style={vars}>
      {streaks.map((s, i) => (
        <span key={i} className="hj-streak absolute left-0 h-px" style={{ top: s.top, width: s.w, opacity: 0, animationDelay: `${s.delay}ms`, "--o": s.o } as CSSProperties} />
      ))}
      <div ref={(el) => { els.current.anchor = el; }} className="absolute" style={{ left: x, top: y }}>
        {/* flash where it drops out of hyperspace */}
        <span className="hj-flash absolute rounded-full" style={{ width: size * 1.4, height: size * 1.4, left: -size * 0.7, top: -size * 0.7 }} />
        {/* the marker the ship follows; carries the trail: three lines that start under the ship (the 3D canvas sits on top) and fade out behind */}
        <div ref={(el) => { els.current.arrive = el; }} className="hj-arrive relative">
          <div className="hj-trail absolute top-0 -translate-y-1/2" style={{ right: size * 0.12 }}>
            {[-0.12, 0, 0.12].map((k, i) => (
              <span key={k} className="absolute right-0 w-full" style={{ top: k * size, height: i === 1 ? 2 : 1.5, opacity: i === 1 ? 1 : 0.8, background: "linear-gradient(to right, rgba(245,243,240,0), rgba(245,243,240,0.6) 45%, #fff)" }} />
            ))}
          </div>
        </div>
      </div>
      {near.mounted && (
        <div className="absolute inset-0">
          <Suspense fallback={null}>
            <ArrivalScene model={model} tone={tone} size={size} els={els} active={near.active} />
          </Suspense>
        </div>
      )}
    </div>
  );
}
