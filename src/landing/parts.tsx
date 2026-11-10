import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/* Shared building blocks for the landing page (1440 grid from the Figma v5 frame). */

// ── tokens (from the frame) ─────────────────────────────────────────────────
export const LINE = "rgba(58,58,58,0.74)";
export const STONE = "#bbbbb5", DUNE = "#f5f3f0", MIST = "#e0dedb", IGNITION = "#6442fd", INK = "#1f1f1f";
/** Orbitron: only the button labels and archive tags use it (from the Figma frame). */
export const ORBITRON: CSSProperties = { fontFamily: '"Orbitron Variable", "Orbitron", sans-serif' };
export const chamferAll = (s: number) =>
  `polygon(${s}px 0, calc(100% - ${s}px) 0, 100% ${s}px, 100% calc(100% - ${s}px), calc(100% - ${s}px) 100%, ${s}px 100%, 0 calc(100% - ${s}px), 0 ${s}px)`;
export const svgUri = (w: number, h: number, body: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>${body}</svg>`)}")`;
export const PATTERN = {
  dots: (c: string) => svgUri(6, 6, `<rect width='1.5' height='1.5' fill='${c}'/><rect x='3' y='3' width='1.5' height='1.5' fill='${c}'/>`),
  hatch: (c: string) => svgUri(5, 5, `<path d='M-1 6L6 -1M-1 1L1 -1M4 6L6 4' stroke='${c}' stroke-width='1'/>`),
  hatchBack: (c: string) => svgUri(5, 5, `<path d='M-1 -1L6 6M4 -1L6 1M-1 4L1 6' stroke='${c}' stroke-width='1'/>`),
  plus: (c: string) => svgUri(10.5, 10.5, `<path d='M2.25 0H1.5v1.5H0v.75h1.5v1.5h.75v-1.5h1.5V1.5h-1.5z' fill='${c}'/>`),
  halftone: svgUri(4, 4, `<rect width='4' height='4' fill='${INK}'/><rect y='2' width='2' height='2' fill='${MIST}'/>`),
};
export const chamfer = (s: number) => `polygon(${s}px 0, 100% 0, 100% calc(100% - ${s}px), calc(100% - ${s}px) 100%, 0 100%, 0 ${s}px)`;
export const display = "font-[family-name:var(--font-display)] font-normal";

// ── shared bits ─────────────────────────────────────────────────────────────
/** A 1440 design row, centred; children are placed in frame coordinates (top = row-relative). */
export function Row({ height, className, style, children, backdrop, passThrough }: { height: number; className?: string; style?: CSSProperties; children: ReactNode; backdrop?: ReactNode; passThrough?: boolean }) {
  return (
    <div className={cn("relative w-full", className)} style={style}>
      {backdrop}
      <div className={cn("relative mx-auto w-[1440px]", passThrough && "pointer-events-none")} style={{ height }}>{children}</div>
    </div>
  );
}

export type BoxProps = { x: number; y: number; w?: number; h?: number; className?: string; style?: CSSProperties; children?: ReactNode; as?: "div" | "p" | "h1" | "h2" | "h3" };
export function Box({ x, y, w, h, className, style, children, as: As = "div" }: BoxProps) {
  return <As className={cn("absolute", className)} style={{ left: x, top: y, width: w, height: h, ...style }}>{children}</As>;
}

export function Corners({ size = 7, color = DUNE }: { size?: number; color?: string }) {
  const b = `1px solid ${color}`;
  const s = { width: size, height: size } as const;
  return (
    <>
      <span aria-hidden className="absolute left-0 top-0" style={{ ...s, borderTop: b, borderLeft: b }} />
      <span aria-hidden className="absolute right-0 top-0" style={{ ...s, borderTop: b, borderRight: b }} />
      <span aria-hidden className="absolute bottom-0 left-0" style={{ ...s, borderBottom: b, borderLeft: b }} />
      <span aria-hidden className="absolute bottom-0 right-0" style={{ ...s, borderBottom: b, borderRight: b }} />
    </>
  );
}

/** Section tag: rule, dot, label, hatch to the end, rule. `dark` = ink on the light panels. */
export function TagStrip({ x, y, w, label, dark = false, solid = false }: { x: number; y: number; w: number; label: string; hatchX?: number; dark?: boolean; solid?: boolean }) {
  const c = dark ? INK : STONE;
  const rule = solid ? "opacity-100" : "opacity-25";
  return (
    <Box x={x} y={y} w={w} h={40} className={dark ? "text-[#1f1f1f]" : undefined}>
      <span className={cn("absolute inset-x-0 top-0 h-px", rule)} style={{ background: c }} />
      <div className="absolute inset-x-0 top-[10px] flex h-[21px] items-center gap-3">
        <span className="size-[9px] shrink-0 rounded-full" style={{ background: c }} />
        <span className="shrink-0 text-[13px] leading-[21px] font-normal">{label}</span>
        <span className={cn("ml-[26px] h-[15px] flex-1", solid ? "opacity-45" : "opacity-50")} style={{ backgroundImage: PATTERN.hatch(c) }} />
      </div>
      <span className={cn("absolute inset-x-0 top-[39px] h-px", rule)} style={{ background: c }} />
    </Box>
  );
}

export function HjMark({ height, color }: { height: number; color: string }) {
  return (
    <svg viewBox="0 0 136.96 168.05" height={height} width={(height * 136.96) / 168.05} aria-hidden>
      <path fill={color} d="M26.14 41.63L26.14 0L0 0L0 145.87L26.14 145.87L26.14 67.77L78.1 67.77L78.1 135.97L104.25 135.97L104.25 41.63Z" />
      <path fill={color} d="M110.81 0L110.81 141.91L72.46 141.91L72.46 129.6L46.32 129.6L46.32 168.05L136.96 168.05L136.96 0Z" />
    </svg>
  );
}

/** Rail + content frame lines for one band of a section. */
export function Frame({ top, height }: { top: number; height: number }) {
  const line = { borderColor: LINE } as const;
  return (
    <>
      <Box x={40} y={top} w={180} h={height} className="pointer-events-none border-x" style={line} />
      <Box x={260} y={top} w={1140} h={height} className="pointer-events-none border-x" style={line} />
    </>
  );
}

// ── icons (traced from the frame; stone at 66%) ─────────────────────────────
export function Icon({ children, width = 2 }: { children: ReactNode; width?: number }) {
  return (
    <svg viewBox="0 0 24 24" className="size-full" fill="none" stroke={STONE} strokeOpacity={0.66} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}
export function IconSearch() { return <Icon><path transform="translate(2 2)" d="M15 15L20 20M5 8.516L5.016 8.5M9 8.516L9.016 8.5M13 8.516L13.016 8.5M17.5 8.75C17.5 13.582 13.582 17.5 8.75 17.5C3.918 17.5 0 13.582 0 8.75C0 3.918 3.918 0 8.75 0C13.582 0 17.5 3.918 17.5 8.75Z" /></Icon>; }
export function IconShield({ thin }: { thin?: boolean }) { return <Icon width={thin ? 1 : 2}><path transform="translate(3 2)" d="M5 10L7.5 12.5L13 7M0 2.222L0 11C0 15.971 4.029 20 9 20C13.971 20 18 15.971 18 11L18 2.222L16.056 2.072C14.363 1.942 12.701 1.542 11.133 0.889L9 0L6.867 0.889C5.299 1.542 3.637 1.942 1.944 2.072Z" /></Icon>; }
export function IconShare() { return <Icon><path transform="translate(3 3)" d="M14 9L15 9C16.657 9 18 10.343 18 12L18 15C18 16.657 16.657 18 15 18L3 18C1.343 18 0 16.657 0 15L0 12C0 10.343 1.343 9 3 9L4 9M5 4L9 0M9 0L13 4M9 0L9 12" /></Icon>; }
export function IconMail() { return <Icon><path transform="translate(3 5)" d="M17.5 0.5L9 8L0.5 0.5M1 14L17 14C17.552 14 18 13.552 18 13L18 1C18 0.448 17.552 0 17 0L1 0C0.448 0 0 0.448 0 1L0 13C0 13.552 0.448 14 1 14Z" /></Icon>; }
export function IconPlug() { return <Icon width={1}><path transform="translate(6 2)" d="M6 16C2.686 16 0 13.314 0 10L0 5L12 5L12 10C12 13.314 9.314 16 6 16ZM6 16L6 20M9 0L9 5M3 0L3 5" /></Icon>; }
export function IconBolt() { return <Icon width={1}><path transform="translate(6 3)" d="M0 9L2 0L9.5 0L8 6L12 6L3 18L4.5 9Z" /></Icon>; }
export function IconChart() { return <Icon width={1}><path transform="translate(3 3)" d="M0 14L5 9L8 12L14 6M14 6L10 6M14 6L14 10M3 18L15 18C16.657 18 18 16.657 18 15L18 3C18 1.343 16.657 0 15 0L3 0C1.343 0 0 1.343 0 3L0 15C0 16.657 1.343 18 3 18Z" /></Icon>; }
