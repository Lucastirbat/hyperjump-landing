import { useEffect, useId, useMemo, useRef, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { chamfer, chamferAll, display, DUNE, IGNITION, INK, MIST, ORBITRON } from "./parts";
import { COUNTRIES, GRATICULE, GRATICULE_LABELS, PROJ } from "./tour-geo";

/*
 * The scouting tour: an interactive star map of central and eastern Europe (Figma "Starmap (interactive)").
 * Lambert conformal conic projection. Country outlines (Natural Earth, tour-geo.ts) under a star chart: cities are stars at their real positions,
 * the tour is a constellation, and the hero's ship flies it. The next stop's country is tinted purple.
 * Where the ship is comes from today's date: parked at the first stop before the tour, between the last
 * stop and the next one during it, at the last stop after. Add ?today=2027-02-10 to the URL to preview a date.
 * Hover or focus a star for its card; click a star or a row to show that stop on the right.
 * Click any country and the ship flies there: to the stop if the country has one, otherwise to the country,
 * with a card pointing at the nearest stop (which also opens on the right).
 */

// ── data ────────────────────────────────────────────────────────────────────
export type Stop = {
  city: string;
  country: string;
  lon: number;
  lat: number;
  /** Day of the event, YYYY-MM-DD (local). */
  date: string;
  time: string;
  venue: string | null;
  /** The stop's Luma event page (RSVP). */
  lumaUrl: string | null;
  /** Which side of the star its label sits on. */
  side?: "left" | "right";
};

/** Why the tour exists, under its title. */
export const TOUR_WHY = "we travel in-person through 16 countries to meet you. in every city, we organize a scouting session where you will be challenged to solve a problem on the spot. if you stand out, you will get fast-tracked to an interview with our investment team.";

// TODO: mock-up dates and times (February 2027) until the real tour is set. Each stop's event will be on
// Luma: put its event URL in `lumaUrl` and the venue once it's announced.
export const TOUR: Stop[] = [
  { city: "bucharest", country: "romania", lon: 26.1, lat: 44.43, date: "2027-02-02", time: "17:00 to 21:00", venue: null, lumaUrl: null },
  { city: "sofia", country: "bulgaria", lon: 23.32, lat: 42.7, date: "2027-02-05", time: "17:00 to 21:00", venue: null, lumaUrl: null },
  { city: "belgrade", country: "serbia", lon: 20.46, lat: 44.79, date: "2027-02-09", time: "17:00 to 21:00", venue: null, lumaUrl: null },
  { city: "budapest", country: "hungary", lon: 19.04, lat: 47.5, date: "2027-02-12", time: "17:00 to 21:00", venue: null, lumaUrl: null, side: "left" },
  { city: "prague", country: "czechia", lon: 14.42, lat: 50.08, date: "2027-02-16", time: "17:00 to 21:00", venue: null, lumaUrl: null },
  { city: "warsaw", country: "poland", lon: 21.01, lat: 52.23, date: "2027-02-19", time: "17:00 to 21:00", venue: null, lumaUrl: null },
  { city: "vilnius", country: "lithuania", lon: 25.28, lat: 54.69, date: "2027-02-23", time: "17:00 to 21:00", venue: null, lumaUrl: null },
  { city: "tallinn", country: "estonia", lon: 24.75, lat: 59.44, date: "2027-02-26", time: "17:00 to 21:00", venue: null, lumaUrl: null },
];

/** Other cities in the region: dim, unlabelled stars. */
const OTHERS = [[14.51, 46.06], [15.98, 45.81], [17.11, 48.15], [28.86, 47.01], [30.52, 50.45], [24.11, 56.95], [18.41, 43.86], [21.43, 42.0], [19.82, 41.33], [19.26, 42.44], [27.56, 53.9], [19.94, 50.06], [23.6, 46.77], [27.6, 47.16], [16.6, 49.2], [24.03, 49.84], [18.65, 54.35], [21.23, 45.75], [23.9, 54.9], [26.7, 58.4], [17.04, 51.11], [21.91, 43.32], [27.92, 43.21], [22.57, 51.25], [26.25, 50.62]] as const;

const day = (iso: string) => new Date(`${iso}T00:00:00`);
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => day(iso).toLocaleDateString("en-GB", o).toLowerCase().replace(",", "");
export const shortDate = (iso: string) => fmt(iso, { weekday: "short", day: "numeric", month: "short" });
export const longDate = (iso: string) => fmt(iso, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** "2 to 26 feb 2027", for the timeline's tour stage. */
export function tourRange(stops = TOUR) {
  const a = day(stops[0]!.date), b = day(stops[stops.length - 1]!.date);
  const mon = (d: Date) => d.toLocaleDateString("en-GB", { month: "short" }).toLowerCase();
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()} to ${b.getDate()} ${mon(b)} ${b.getFullYear()}`
    : `${a.getDate()} ${mon(a)} to ${b.getDate()} ${mon(b)} ${b.getFullYear()}`;
}

/** Today, or ?today=YYYY-MM-DD for previewing the tour at any date. */
function today() {
  if (typeof window !== "undefined") {
    const q = new URLSearchParams(window.location.search).get("today");
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return day(q);
  }
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export type StopState = "visited" | "next" | "upcoming";
export type Tour = {
  stops: Stop[];
  state: StopState[];
  /** Index of the next stop, or -1 when the tour is over. */
  next: number;
  /** Days until the next stop (0 = today). */
  inDays: number;
  /** Where the ship is: on the leg from stop `leg` to `leg + 1`, `t` of the way. */
  leg: number;
  t: number;
};

export function useTour(stops = TOUR): Tour {
  return useMemo(() => {
    const now = today().getTime();
    const times = stops.map((s) => day(s.date).getTime());
    const next = times.findIndex((t) => t >= now);
    const state: StopState[] = stops.map((_, i) => (next === -1 || i < next ? "visited" : i === next ? "next" : "upcoming"));
    const inDays = next === -1 ? 0 : Math.round((times[next]! - now) / 864e5);
    let leg = 0, t = 0;
    if (next === -1) { leg = stops.length - 2; t = 1; }
    else if (next > 0) {
      leg = next - 1;
      t = Math.min(0.85, Math.max(0.15, (now - times[next - 1]!) / (times[next]! - times[next - 1]!)));
    }
    return { stops, state, next, inDays, leg, t };
  }, [stops]);
}

export function chipText(tour: Tour) {
  if (tour.next === -1) return "tour finished // thanks for coming";
  const when = tour.inDays === 0 ? "today" : tour.inDays === 1 ? "tomorrow" : `in ${tour.inDays} days`;
  return `${tour.next === 0 ? "first stop" : "next stop"} // ${when}`;
}

// ── map geometry ────────────────────────────────────────────────────────────
export const MAP_W = 640, MAP_H = 637;
/** Lambert conformal conic, same constants as the baked outlines (tour-geo.ts), so shapes aren't stretched. */
const RAD = Math.PI / 180;
function P(lon: number, lat: number): [number, number] {
  const rho = PROJ.F / Math.pow(Math.tan(Math.PI / 4 + (lat * RAD) / 2), PROJ.n);
  const th = PROJ.n * (lon - PROJ.lon0) * RAD;
  return [PROJ.tx + rho * Math.sin(th) * PROJ.s, PROJ.ty - (PROJ.rho0 - rho * Math.cos(th)) * PROJ.s];
}
const HALO = "#9999ff";
const SHIP = 56;
const FRAME = `M16 0H${MAP_W - 16}L${MAP_W} 16V${MAP_H - 16}L${MAP_W - 16} ${MAP_H}H16L0 ${MAP_H - 16}V16Z`;

/** Natural Earth's short names, spelled out for the card. */
const COUNTRY_NAME: Record<string, string> = { "bosnia and herz.": "bosnia and herzegovina", macedonia: "north macedonia" };
const countryName = (n: string) => COUNTRY_NAME[n] ?? n;

/** Where the ship lands for a country: the area centroid of its largest outline, kept inside the frame. */
const CENTRES: Record<string, [number, number]> = Object.fromEntries(COUNTRIES.map((c) => {
  let best: [number, number] = [MAP_W / 2, MAP_H / 2], bestA = 0;
  for (const ring of c.d.split("M").filter(Boolean)) {
    const v = ring.replace(/Z/g, "").split("L").map((p) => p.trim().split(/\s+/).map(Number) as [number, number]);
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < v.length; i++) {
      const [x0, y0] = v[i]!, [x1, y1] = v[(i + 1) % v.length]!;
      const k = x0 * y1 - x1 * y0;
      a += k; cx += (x0 + x1) * k; cy += (y0 + y1) * k;
    }
    if (Math.abs(a) > bestA) { bestA = Math.abs(a); best = [cx / (3 * a), cy / (3 * a)]; }
  }
  return [c.name, [Math.min(MAP_W - 50, Math.max(50, best[0])), Math.min(MAP_H - 50, Math.max(70, best[1]))]];
}));

/** Ship top-down render for a hero ship model (public/landing/ships). */
export const shipTopFor = (modelUrl: string) => modelUrl.replace("/models/ships/", "/landing/ships/").replace(/\.glb$/, "-top.png");

function useStarfield() {
  return useMemo(() => {
    let seed = 7;
    const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const sizes = [0.5, 0.5, 0.6, 0.7, 0.8, 1, 1.2];
    return Array.from({ length: 260 }, () => {
      const r = sizes[Math.floor(rnd() * sizes.length)]!;
      const x = 6 + rnd() * 628, y = 6 + rnd() * 625;
      return { x: x + r, y: y + r, r, o: r < 0.9 ? 0.1 + rnd() * 0.3 : 0.3 + rnd() * 0.3 };
    });
  }, []);
}

/** Point `d` px along a polyline, with the heading (degrees clockwise from up) of the segment it's on. */
function along(pts: [number, number][], d: number) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i]!, [bx, by] = pts[i + 1]!;
    const len = Math.hypot(bx - ax, by - ay);
    if (d <= len || i === pts.length - 2) {
      const k = len ? Math.min(1, d / len) : 0;
      return { x: ax + (bx - ax) * k, y: ay + (by - ay) * k, seg: i, heading: (Math.atan2(bx - ax, -(by - ay)) * 180) / Math.PI };
    }
    d -= len;
  }
  return { x: pts[0]![0], y: pts[0]![1], seg: 0, heading: 0 };
}

/** Distance along the route to where the ship rests today. */
function restDistance(pts: [number, number][], tour: Tour) {
  let d = 0;
  for (let i = 0; i < tour.leg; i++) d += Math.hypot(pts[i + 1]![0] - pts[i]![0], pts[i + 1]![1] - pts[i]![1]);
  const [ax, ay] = pts[tour.leg]!, [bx, by] = pts[tour.leg + 1]!;
  return d + Math.hypot(bx - ax, by - ay) * tour.t;
}

/** Flies the ship from the first stop to where it rests, once, when the map scrolls into view. */
function useFlight(rest: number, box: RefObject<HTMLDivElement | null>) {
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [d, setD] = useState(reduced ? rest : 0);
  useEffect(() => {
    if (reduced) { setD(rest); return; }
    const el = box.current; if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      io.disconnect();
      const start = performance.now(), dur = 900 + Math.min(1800, rest * 4);
      const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
      const step = (now: number) => {
        const k = Math.min(1, (now - start) / dur);
        setD(rest * ease(k));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [rest, reduced, box]);
  return d;
}

type Pose = { x: number; y: number; heading: number };

/** Flies the ship in a straight line to wherever the visitor sends it; null until they do. */
function useFreeFlight() {
  const [pose, setPose] = useState<Pose | null>(null);
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const flyTo = (from: Pose, to: [number, number]) => {
    cancelAnimationFrame(raf.current);
    const dx = to[0] - from.x, dy = to[1] - from.y, dist = Math.hypot(dx, dy);
    const heading = dist < 1 ? from.heading : (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (dist < 1 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setPose({ x: to[0], y: to[1], heading }); return; }
    // turn towards the target in the first part of the flight, then cruise
    let turn = heading - from.heading; turn = ((turn + 540) % 360) - 180;
    const start = performance.now(), dur = Math.min(1600, 450 + dist * 2.2);
    const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / dur), e = ease(k);
      setPose({ x: from.x + dx * e, y: from.y + dy * e, heading: from.heading + turn * Math.min(1, k * 3) });
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };
  return [pose, flyTo] as const;
}

// ── the map ─────────────────────────────────────────────────────────────────
export function TourMap({ tour, shipSrc, selected, onSelect }: { tour: Tour; shipSrc: string; selected: number; onSelect: (i: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const field = useStarfield();
  const pts = useMemo(() => tour.stops.map((s) => P(s.lon, s.lat)), [tour.stops]);
  const rest = useMemo(() => restDistance(pts, tour), [pts, tour]);
  const d = useFlight(rest, box);
  const route = along(pts, d); // today's progress along the tour: drives the route lines
  const [free, flyTo] = useFreeFlight();
  const ship = free ?? route; // where the ship is drawn: on the route, or wherever it was sent
  // a country without a stop: the ship flies there and a card points to the nearest stop
  const [picked, setPicked] = useState<{ country: string; nearest: number } | null>(null);
  // fly to a stop when the visitor picks one (not on the default selection)
  const lastSel = useRef(selected);
  const skipFly = useRef(false); // set when a country click already sent the ship somewhere
  useEffect(() => {
    if (lastSel.current === selected) return;
    lastSel.current = selected;
    if (skipFly.current) { skipFly.current = false; return; }
    setPicked(null);
    flyTo(ship, pts[selected]!);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fly only when the selection changes
  }, [selected]);
  const pickCountry = (name: string) => {
    const stop = tour.stops.findIndex((s) => s.country === name);
    if (stop !== -1) {
      setPicked(null);
      if (stop === selected) flyTo(ship, pts[stop]!); else onSelect(stop);
      return;
    }
    const to = CENTRES[name]!;
    const nearest = pts.reduce((b, p, i) => (Math.hypot(p[0] - to[0], p[1] - to[1]) < Math.hypot(pts[b]![0] - to[0], pts[b]![1] - to[1]) ? i : b), 0);
    setPicked({ country: name, nearest });
    flyTo(ship, to);
    if (nearest !== selected) { skipFly.current = true; onSelect(nearest); }
  };
  const ahead: [number, number][] = [[route.x, route.y], ...pts.slice(route.seg + 1)];
  const line = (p: [number, number][]) => "M" + p.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L");
  const [hover, setHover] = useState<number | null>(null);
  const tourCountries = useMemo(() => new Set(tour.stops.map((s) => s.country)), [tour.stops]);
  const nextCountry = tour.next === -1 ? null : tour.stops[tour.next]!.country;
  const selCountry = picked?.country ?? tour.stops[selected]!.country;
  const clipId = `hj-tour-clip-${useId().replace(/:/g, "")}`;
  const rad = (ship.heading * Math.PI) / 180;
  const tail = { x: ship.x - Math.sin(rad) * 24, y: ship.y + Math.cos(rad) * 24 };

  return (
    <div ref={box} className="relative select-none" style={{ width: MAP_W, height: MAP_H }}>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width={MAP_W} height={MAP_H} className="absolute inset-0" role="img" aria-label={`map of the scouting tour: ${tour.stops.map((s) => s.city).join(", ")}`}>
        <defs>
          <clipPath id={clipId}><path d={FRAME} /></clipPath>
          <filter id="hj-tour-glow" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="6" /></filter>
          <filter id="hj-tour-engine" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="3.5" /></filter>
        </defs>
        <path d={FRAME} fill={INK} />

        {/* countries: tour countries a touch brighter, the next stop's purple, the selected one lifted */}
        <g strokeLinejoin="round" clipPath={`url(#${clipId})`}>
          {COUNTRIES.map((c) => {
            const isNext = c.name === nextCountry, isSel = c.name === selCountry, onTour = tourCountries.has(c.name);
            return (
              <path
                key={c.name}
                d={c.d}
                fill={isNext ? IGNITION : DUNE}
                fillOpacity={isNext ? 0.2 : isSel ? 0.09 : onTour ? 0.055 : 0.025}
                stroke={isNext ? IGNITION : DUNE}
                strokeOpacity={isNext ? 0.75 : onTour ? 0.3 : 0.16}
                strokeWidth={0.75}
                onClick={() => pickCountry(c.name)}
                className="cursor-pointer transition-[fill-opacity,stroke-opacity] duration-300 hover:fill-opacity-[0.12] hover:stroke-opacity-60"
              />
            );
          })}
        </g>

        {/* graticule: meridians converge, parallels curve (it's a conic projection) */}
        <path d={GRATICULE} fill="none" stroke={DUNE} strokeOpacity={0.06} clipPath={`url(#${clipId})`} />
        <g fill={DUNE} fillOpacity={0.3} fontSize={10} className="font-[family-name:var(--font-sans)]">
          {GRATICULE_LABELS.map((l) => <text key={l.t} x={l.x} y={l.y}>{l.t}</text>)}
        </g>

        {/* sky */}
        <g fill={DUNE}>{field.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fillOpacity={s.o} />)}</g>
        <g fill={DUNE} fillOpacity={0.4}>{OTHERS.map(([lon, lat], i) => { const [x, y] = P(lon, lat); return <circle key={i} cx={x} cy={y} r={1.5} />; })}</g>

        {/* route: flown solid, the leg in progress purple, the rest dashed */}
        {route.seg > 0 && <path d={line(pts.slice(0, route.seg + 1))} stroke={DUNE} strokeOpacity={0.5} strokeWidth={1.25} fill="none" />}
        <path d={line([pts[route.seg]!, [route.x, route.y]])} stroke={IGNITION} strokeWidth={1.5} fill="none" />
        <path d={line(ahead.slice(0, 2))} stroke={HALO} strokeOpacity={0.7} strokeWidth={1.25} strokeDasharray="3 4" fill="none" />
        {ahead.length > 2 && <path d={line(ahead.slice(1))} stroke={DUNE} strokeOpacity={0.3} strokeDasharray="3 5" fill="none" className="hj-flow" />}

        {/* stops */}
        {pts.map(([x, y], i) => {
          const st = tour.state[i]!;
          return (
            <g key={i}>
              {st === "next" && (
                <>
                  <circle cx={x} cy={y} r={15} fill={IGNITION} fillOpacity={0.45} filter="url(#hj-tour-glow)" />
                  <circle cx={x} cy={y} r={22} fill="none" stroke={IGNITION} strokeOpacity={0.3} />
                  <circle cx={x} cy={y} r={12} fill="none" stroke={IGNITION} strokeOpacity={0.8} className="hj-ping" />
                  <circle cx={x} cy={y} r={5} fill={IGNITION} />
                </>
              )}
              {st === "visited" && <circle cx={x} cy={y} r={3.5} fill={DUNE} />}
              {st === "upcoming" && <circle cx={x} cy={y} r={4} fill={INK} stroke={DUNE} strokeOpacity={0.8} strokeWidth={1.25} />}
              {(hover === i || (selected === i && st !== "next")) && <circle cx={x} cy={y} r={8} fill="none" stroke={DUNE} strokeOpacity={0.6} />}
            </g>
          );
        })}

        {/* ship */}
        <g style={{ pointerEvents: "none" }}>
          <circle cx={tail.x} cy={tail.y} r={8} fill={IGNITION} fillOpacity={0.8} filter="url(#hj-tour-engine)" className="hj-engine" />
          <g className="hj-ship-bob">
            <image href={shipSrc} width={SHIP} height={SHIP} transform={`translate(${ship.x.toFixed(2)} ${ship.y.toFixed(2)}) rotate(${ship.heading.toFixed(2)}) translate(${-SHIP / 2} ${-SHIP / 2})`} />
          </g>
        </g>
      </svg>

      {/* labels (HTML, so the brand fonts and opacities match the rest of the page) */}
      {pts.map(([x, y], i) => {
        const s = tour.stops[i]!, st = tour.state[i]!;
        const left = s.side === "left";
        if (hover === i) return null;
        if (st === "next") {
          return (
            <div key={i} className={cn("pointer-events-none absolute whitespace-nowrap", left && "text-right")} style={left ? { right: MAP_W - x + 28, top: y - 18 } : { left: x + 28, top: y - 18 }}>
              <p className="text-[13px] leading-[17px] font-medium text-[#f5f3f0]">{s.city}, {s.country}</p>
              <p className="text-[11px] leading-[14px]" style={{ color: HALO }}>{tour.next === 0 ? "first stop" : "next stop"} // {shortDate(s.date)}</p>
            </div>
          );
        }
        const o = st === "visited" ? [0.5, 0.3] : [0.85, 0.5];
        return (
          <div key={i} className={cn("pointer-events-none absolute whitespace-nowrap", left && "text-right")} style={left ? { right: MAP_W - x + 12, top: y - 15 } : { left: x + 12, top: y - 15 }}>
            <p className="text-[12px] leading-4" style={{ color: `rgba(245,243,240,${o[0]})` }}>{s.city}</p>
            <p className="text-[11px] leading-[14px]" style={{ color: `rgba(245,243,240,${o[1]})` }}>{shortDate(s.date)}</p>
          </div>
        );
      })}

      {/* legend */}
      <div aria-hidden className="pointer-events-none absolute left-5 top-[19px] flex items-center gap-[22px] text-[11px] leading-[14px] text-[#f5f3f0]/55">
        <span className="flex items-center gap-[7px]"><span className="size-[7px] rounded-full bg-[#f5f3f0]" />visited</span>
        <span className="flex items-center gap-[6px]"><span className="size-2 rounded-full" style={{ background: IGNITION }} />next stop</span>
        <span className="flex items-center gap-[6px]"><span className="size-2 rounded-full border-[1.25px] border-[#f5f3f0]/80" />coming up</span>
      </div>

      {/* hit targets: hover/focus shows the stop's card, click selects it */}
      {pts.map(([x, y], i) => {
        const s = tour.stops[i]!;
        return (
          <button
            key={i}
            type="button"
            aria-label={`${s.city}, ${s.country}, ${longDate(s.date)}`}
            aria-pressed={selected === i}
            onClick={() => onSelect(i)}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            className="absolute size-7 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full"
            style={{ left: x, top: y }}
          />
        );
      })}
      {hover !== null && <StopCard stop={tour.stops[hover]!} at={pts[hover]!} />}
      {picked && hover === null && <CountryCard country={picked.country} stop={tour.stops[picked.nearest]!} at={CENTRES[picked.country]!} onClose={() => setPicked(null)} />}
    </div>
  );
}

function StopCard({ stop, at: [x, y] }: { stop: Stop; at: [number, number] }) {
  const W = 176;
  const flip = x + 14 + W > MAP_W - 12;
  return (
    <div aria-hidden className="pointer-events-none absolute z-10 px-3 py-2.5 animate-[hjfade_200ms_ease-out]" style={{ width: W, left: flip ? x - 14 - W : x + 14, top: y + 12, background: DUNE, clipPath: chamferAll(8) }}>
      <p className="text-[13px] leading-[17px] font-medium text-[#1f1f1f]">{stop.city}, {stop.country}</p>
      <p className="mt-[3px] text-[12px] leading-4 text-[#1f1f1f]/75">{longDate(stop.date)}</p>
      <p className="mt-[2px] text-[12px] leading-4 text-[#1f1f1f]/50">{stop.venue ?? "venue to be announced"}</p>
    </div>
  );
}

/** "no stop in moldova yet": the nearest one instead, next to where the ship landed. */
function CountryCard({ country, stop, at: [x, y], onClose }: { country: string; stop: Stop; at: [number, number]; onClose: () => void }) {
  const W = 196;
  const flip = x + 34 + W > MAP_W - 12;
  return (
    <div role="status" className="absolute z-10 px-3 py-2.5 animate-[hjfade_200ms_ease-out]" style={{ width: W, left: flip ? x - 34 - W : x + 34, top: y - 10, background: DUNE, clipPath: chamferAll(8) }}>
      <button type="button" aria-label="close" onClick={onClose} className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center text-[#1f1f1f]/50 hover:text-[#1f1f1f]">
        <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden><path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth={1.3} /></svg>
      </button>
      <p className="pr-4 text-[13px] leading-[17px] font-medium text-[#1f1f1f]">no stop in {countryName(country)} yet</p>
      <p className="mt-[3px] text-[12px] leading-4 text-[#1f1f1f]/75">nearest: {stop.city}, {shortDate(stop.date)}</p>
    </div>
  );
}

// ── the selected stop and the list ──────────────────────────────────────────
export function StopDetails({ tour, selected, className }: { tour: Tour; selected: number; className?: string }) {
  const s = tour.stops[selected]!;
  const st = tour.state[selected]!;
  const chip = selected === tour.next ? chipText(tour) : st === "visited" ? `visited // ${shortDate(s.date)}` : `coming up // ${shortDate(s.date)}`;
  const rows: [string, string][] = [["date", longDate(s.date)], ["time", s.time], ["venue", s.venue ?? "to be announced"]];
  return (
    <div className={className} aria-live="polite">
      <span className="inline-flex items-center gap-1.5 px-2 py-1 text-[12px] leading-[17px] text-[#1f1f1f]/80" style={{ background: MIST }}>
        <span className="size-1.5 rounded-full" style={{ background: st === "next" ? IGNITION : st === "visited" ? INK : "transparent", boxShadow: st === "upcoming" ? `inset 0 0 0 1px ${INK}` : undefined }} />
        {chip}
      </span>
      <p className={cn(display, "mt-[9px] text-[48px] leading-[52px] tracking-[-0.03em] text-[#1f1f1f]")}>{s.city}</p>
      <p className="mt-1 text-[15px] leading-[21px] text-[#1f1f1f]/66">{s.country}</p>
      <dl className="mt-[21px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex h-[34px] items-center justify-between border-t text-[13px] leading-[21px]" style={{ borderColor: "rgba(31,31,31,0.12)" }}>
            <dt className="text-[#1f1f1f]/66">{k}</dt><dd className="text-[#1f1f1f]">{v}</dd>
          </div>
        ))}
        <div className="border-t" style={{ borderColor: "rgba(31,31,31,0.12)" }} />
      </dl>
      {st === "visited" ? (
        <p className="mt-[23px] flex h-[45px] items-center text-[13px] leading-[21px] text-[#1f1f1f]/66">we were here on {shortDate(s.date)}. thanks for coming.</p>
      ) : (
        <a
          href={s.lumaUrl ?? "#"}
          target={s.lumaUrl ? "_blank" : undefined}
          rel={s.lumaUrl ? "noopener noreferrer" : undefined}
          className="mt-[23px] flex h-[45px] w-[264px] max-w-full items-center justify-center text-[13px] leading-[21px] font-bold text-[#f5f3f0] opacity-95 transition-opacity hover:opacity-100"
          style={{ background: INK, clipPath: chamfer(16), ...ORBITRON }}
        >
          save a spot in {s.city}
        </a>
      )}
    </div>
  );
}

export function StopList({ tour, selected, onSelect, className }: { tour: Tour; selected: number; onSelect: (i: number) => void; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[13px] leading-[21px] text-[#1f1f1f]/66">all stops</p>
      <ol className="mt-2.5 border-b" style={{ borderColor: "rgba(31,31,31,0.12)" }}>
        {tour.stops.map((s, i) => {
          const st = tour.state[i]!;
          return (
            <li key={s.city} className="border-t" style={{ borderColor: "rgba(31,31,31,0.12)" }}>
              <button
                type="button"
                aria-pressed={selected === i}
                onClick={() => onSelect(i)}
                className={cn("-mx-2 flex h-[33px] w-[calc(100%+16px)] items-center px-2 text-left text-[13px] leading-[21px] transition-colors hover:bg-[#e0dedb]/60", selected === i && "bg-[#e0dedb] hover:bg-[#e0dedb]", st === "visited" && "opacity-50")}
              >
                <span className="w-7 text-[#1f1f1f]/25">{String(i + 1).padStart(2, "0")}</span>
                <span className="mr-[7px] flex w-[7px] justify-center">
                  {st === "next" ? <span className="size-2 rounded-full" style={{ background: IGNITION }} />
                    : st === "visited" ? <span className="size-1.5 rounded-full" style={{ background: INK }} />
                    : <span className="size-[7px] rounded-full border-[1.25px] border-[#1f1f1f]/60" />}
                </span>
                <span className={cn("w-[102px] text-[#1f1f1f]", st === "next" && "font-medium")}>{s.city}</span>
                <span className="text-[#1f1f1f]/66">{s.country}</span>
                <span className="ml-auto text-[#1f1f1f]/80">{shortDate(s.date)}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Selected stop: the next one by default. */
export function useSelectedStop(tour: Tour) {
  return useState(tour.next === -1 ? tour.stops.length - 1 : tour.next);
}
