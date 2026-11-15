import posthog from "posthog-js";
import { APP_URL } from "@/lib/config";

/*
 * PostHog: product analytics for the landing page.
 *
 * Nothing is stored on the visitor's device (no cookies, no localStorage), so the page needs no cookie
 * banner. The trade-off: each visit is a fresh anonymous visitor, so PostHog can't link two visits by the
 * same person. For a one-page site that still gives full funnels within a visit.
 *
 * Events (besides PostHog's own $pageview, $pageleave, $autocapture and $exception):
 *   section_viewed           a section reaches the middle of the screen, once per visit   { section }
 *   application_cta_clicked  any "apply" link into the platform                         { section, label, path }
 *   external_link_clicked    a link to another site (exponential, linkedin, startups)   { section, label, url, domain }
 *   in_page_link_clicked     nav, side nav, footer and other jumps within the page      { section, label, target }
 *   placeholder_link_clicked a link that has no destination yet (href="#")             { section, label }
 *   tour_rsvp_clicked        "save a spot in <city>"                                     { city, country, has_link }
 *   tour_stop_selected       a stop picked on the map or in the list                     { city, country, source }
 *   tour_country_selected    a country clicked on the map                                { country, has_scheduled_stop }
 *   faq_opened               a question opened                                           { question, position }
 *   vesting_ruler_moved      the equity ruler left at a new month                        { month, vested_pct, input }
 *   mobile_menu_opened       the phone menu opened
 */

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST;
const isPosthogConfigured = Boolean(posthogKey && posthogHost);

/** Dedicated PostHog Logs emitter; existing application logging remains local. */
export const posthogLogger = {
  info(message: string, attributes?: Parameters<typeof posthog.logger.info>[1]) {
    if (isPosthogConfigured) posthog.logger.info(message, attributes);
  },
};

/** Sends an event; does nothing when PostHog isn't configured (local dev without keys). */
export function track(event: string, properties?: Record<string, unknown>) {
  if (isPosthogConfigured) posthog.capture(event, properties);
}

// ── where on the page something happened ──────────────────────────────────────────────────────────────
// (the scouting tour counts as part of the timeline: its "tour" anchor doesn't wrap the map)
const SECTIONS = new Set(["top", "who", "get", "crew", "past", "timeline", "conditions", "faq"]);

/** The page section an element sits in: a section id, or nav / side_nav / menu / footer / intro. */
export function sectionOf(el: Element | null): string {
  if (!el) return "unknown";
  if (el.closest('nav[aria-label="Sections"]')) return "side_nav";
  if (el.closest('nav[aria-label="Menu"]')) return "menu";
  if (el.closest("header")) return "nav";
  if (el.closest("footer")) return "footer";
  // innermost section wins: the tour sits inside the timeline
  for (let n: Element | null = el; n; n = n.parentElement) if (n.id && SECTIONS.has(n.id)) return n.id;
  return "intro";
}

// the side nav's "03" counters are dropped: "03pit crew" → "pit crew"
const labelOf = (a: HTMLAnchorElement) => (a.getAttribute("aria-label") || a.textContent || "").replace(/\s+/g, " ").trim().replace(/^0\d\s*/, "").slice(0, 80);

/** Every link click, sorted by where it goes. Links with their own event set data-track and are skipped. */
function onLinkClick(e: MouseEvent) {
  const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!a || a.dataset.track) return;
  const href = a.getAttribute("href") ?? "";
  const base = { section: sectionOf(a), label: labelOf(a) };
  if (href === "#" || href === "") return track("placeholder_link_clicked", base);
  if (href.startsWith("#")) return track("in_page_link_clicked", { ...base, target: href.slice(1) });
  const url = new URL(a.href, location.href);
  if (url.origin === new URL(APP_URL).origin) return track("application_cta_clicked", { ...base, path: url.pathname });
  if (url.origin !== location.origin) track("external_link_clicked", { ...base, url: url.href, domain: url.hostname.replace(/^www\./, "") });
}

/**
 * section_viewed, once per section per visit: whichever section is in the middle of the screen. Checked on
 * scroll (once per frame) rather than with observers, so sections that mount late are still counted.
 */
export function watchSections() {
  if (!isPosthogConfigured) return () => {};
  const seen = new Set<string>();
  let timer = 0;
  const check = () => {
    timer = 0;
    const id = sectionOf(document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2));
    if (SECTIONS.has(id) && !seen.has(id)) { seen.add(id); track("section_viewed", { section: id }); }
  };
  // at most every 150ms while scrolling, and once more where the scroll stops
  const onScroll = () => { if (!timer) timer = window.setTimeout(check, 150); };
  window.addEventListener("scroll", onScroll, { passive: true });
  const t = window.setTimeout(check, 1000);
  return () => { window.removeEventListener("scroll", onScroll); window.clearTimeout(timer); window.clearTimeout(t); };
}

if (isPosthogConfigured) {
  posthog.init(posthogKey!, {
    api_host: posthogHost!,
    persistence: "memory", // no cookies or localStorage: no consent banner needed
    person_profiles: "identified_only",
    logs: {
      serviceName: "hyperjump-landing",
      environment: import.meta.env.MODE,
    },
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
  });
  document.addEventListener("click", onLinkClick, { capture: true });
  if (import.meta.env.DEV) (window as unknown as { posthog: typeof posthog }).posthog = posthog; // for checking events locally
  posthogLogger.info("landing_page_initialized", { runtime: "browser" });
} else if (import.meta.env.DEV) {
  const missingVariable = posthogKey ? "VITE_POSTHOG_HOST" : "VITE_POSTHOG_KEY";
  console.warn(`PostHog is off: ${missingVariable} isn't set, so no events are sent. See .env.example.`);
}

export default posthog;
