import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "@/lib/utils";
import { IGNITION } from "./parts";

/*
 * The pit crew's equity as a 24-month ruler you can drag: it vests every month, so each tick is
 * 5% / 24 more. The handle snaps to months; the readout shows what's been earned at that point.
 * Fluid width: desktop puts it in a 497px box, mobile lets it fill the card.
 */

const MONTHS = 24, TOTAL = 5;
const vested = (m: number) => (TOTAL * m) / MONTHS;
const fmt = (m: number) => `${vested(m).toFixed(2).replace(/\.?0+$/, "")}%`;
const label = (m: number) => (m === 0 ? "day one" : m === 1 ? "month 1" : `month ${m}`);
const tick = (m: number) => (m % 12 === 0 ? { h: 10, o: 0.75 } : m % 6 === 0 ? { h: 7, o: 0.45 } : { h: 4, o: 0.25 });
const at = (m: number) => `calc((100% - 1px) * ${m / MONTHS})`;

export function VestingRuler({ className }: { className?: string }) {
  const [month, setMonth] = useState(12);
  const [dragging, setDragging] = useState(false);
  const track = useRef<HTMLDivElement>(null);

  const fromPointer = (e: PointerEvent) => {
    const r = track.current?.getBoundingClientRect(); if (!r || !r.width) return;
    setMonth(Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * MONTHS));
  };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true); fromPointer(e);
    (e.currentTarget.querySelector('[role="slider"]') as HTMLElement | null)?.focus({ preventScroll: true });
  };
  const key = (e: KeyboardEvent) => {
    const step: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 6, PageDown: -6 };
    if (e.key === "Home") setMonth(0);
    else if (e.key === "End") setMonth(MONTHS);
    else if (step[e.key]) setMonth((m) => Math.min(MONTHS, Math.max(0, m + step[e.key]!)));
    else return;
    e.preventDefault();
  };

  const small = "absolute top-[51px] text-[11px] leading-4 text-[rgba(38,38,38,0.6)]";
  return (
    <div className={cn("relative h-[72px] text-[#262626]", className)}>
      <div className="flex justify-between text-[13px] leading-[21px]">
        <span className="opacity-75">equity, earned over 2 years</span>
        <span aria-live="polite" className="tabular-nums">
          <span className="opacity-50">{label(month)}: </span><span className="font-medium opacity-90">{fmt(month)}</span>
        </span>
      </div>
      {/* drag area: the rail plus room above and below it */}
      <div
        ref={track}
        onPointerDown={down}
        onPointerMove={(e) => dragging && fromPointer(e)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        className={cn("group absolute inset-x-0 top-[22px] h-7 touch-pan-y select-none", dragging ? "cursor-grabbing" : "cursor-grab")}
      >
        <div aria-hidden className="absolute inset-x-0 top-3 h-[3px] bg-[rgba(70,70,70,0.14)]" />
        <div aria-hidden className={cn("absolute left-0 top-3 h-[3px]", !dragging && "transition-[width] duration-200 ease-out")} style={{ width: at(month), background: IGNITION }} />
        {Array.from({ length: MONTHS + 1 }, (_, m) => {
          const t = tick(m);
          return <span key={m} aria-hidden className="absolute top-[18px] w-px" style={{ left: at(m), height: t.h, background: m <= month && m > 0 ? IGNITION : `rgba(38,38,38,${t.o})`, opacity: m <= month && m > 0 ? 0.6 : 1 }} />;
        })}
        {/* the goal: fades out as the handle reaches it, so the two never sit half on top of each other */}
        <span aria-hidden className="absolute right-0 top-[9px] size-[9px] border bg-[#f5f3f0] transition-opacity duration-150" style={{ borderColor: "rgba(38,38,38,0.75)", opacity: month >= MONTHS - 1 ? 0 : 1 }} />
        {/* handle */}
        <span
          role="slider"
          tabIndex={0}
          aria-label="months since you joined"
          aria-valuemin={0}
          aria-valuemax={MONTHS}
          aria-valuenow={month}
          aria-valuetext={`${label(month)}: ${fmt(month)} of ${TOTAL}% vested`}
          onKeyDown={key}
          className={cn("absolute top-[13.5px] -ml-[7px] -mt-[7px] flex size-[14px] items-center justify-center rounded-full", !dragging && "transition-[left] duration-200 ease-out")}
          style={{ left: `calc(${at(month)} + 0.5px)` }}
        >
          <span className={cn("size-[11px] rounded-full ring-0 ring-[#6442fd]/25 transition-[box-shadow,transform] duration-150 group-hover:ring-[6px]", dragging && "scale-110 ring-[6px]")} style={{ background: IGNITION }} />
        </span>
      </div>
      <span className={small} style={{ left: 0 }}>day one: 0%</span>
      <span className={cn(small, "left-1/2 -translate-x-1/2")}>1 year</span>
      <span className={small} style={{ right: 0 }}>2 years: 5%</span>
    </div>
  );
}
