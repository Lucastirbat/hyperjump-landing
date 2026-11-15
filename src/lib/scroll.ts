import Lenis from "lenis";
import "lenis/dist/lenis.css";

/*
 * Smooth scrolling (Lenis) for mouse wheels and trackpads. Touch keeps the phone's own scrolling, and
 * visitors who ask for reduced motion get the browser's plain scrolling (Lenis is never started).
 *
 * The hero's launch lock (landing.tsx) runs first: while it swallows a wheel event (preventDefault),
 * Lenis leaves that event alone, so the page holds still while the ship launches.
 *
 * In-page links (#faq, #crew-…) glide there through Lenis, stopping short by each section's
 * scroll-margin (the fixed header), and still update the address bar like a normal jump.
 */

let lenis: Lenis | null = null;

/** Starts Lenis once; returns a cleanup that stops it. */
export function startSmoothScroll() {
  if (lenis || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  const instance = new Lenis({
    autoRaf: true,
    // the launch lock already handled (and blocked) this wheel event: don't scroll
    virtualScroll: ({ event }) => !event.defaultPrevented,
  });
  lenis = instance;

  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
    const hash = a?.getAttribute("href") ?? "";
    if (hash.length < 2) return; // "#" placeholders: nothing to scroll to
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    instance.scrollTo(target);
    history.pushState(null, "", hash);
  };
  document.addEventListener("click", onClick);

  return () => {
    document.removeEventListener("click", onClick);
    instance.destroy();
    if (lenis === instance) lenis = null;
  };
}

/** Back to the top: glides with Lenis when it's running, otherwise the browser's own smooth scroll. */
export function scrollToTop() {
  if (lenis) lenis.scrollTo(0);
  else window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}
