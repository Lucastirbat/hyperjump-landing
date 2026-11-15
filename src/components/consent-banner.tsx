import { useEffect, useState } from "react";
import { setConsent, useConsent } from "@/lib/consent";
import { chamfer, display, DUNE, INK } from "@/landing/parts";

/*
 * The cookie banner. A small card in the bottom-left corner (a strip along the bottom on phones) that
 * never blocks the page. Accept and decline look exactly the same: the choice is the visitor's. It waits
 * for the preloader and a beat after it, so it doesn't land on top of the opening moment.
 * Shown until answered, again after a year, and whenever "cookie settings" is clicked.
 */

const PRIVACY_HREF = "/privacy";

export function ConsentBanner() {
  const { consent, show } = useConsent();
  const [ready, setReady] = useState(false);

  // after the preloader has lifted, plus a beat
  useEffect(() => {
    if (!show || ready) return;
    let t = 0;
    const poll = () => {
      if (document.documentElement.classList.contains("hj-booting")) t = window.setTimeout(poll, 200);
      else t = window.setTimeout(() => setReady(true), 900);
    };
    poll();
    return () => window.clearTimeout(t);
  }, [show, ready]);

  if (!show || !ready) return null;
  const btn = "flex h-10 flex-1 items-center justify-center text-[13px] leading-[21px] font-medium text-[#f5f3f0] opacity-90 transition-opacity hover:opacity-100 focus-visible:opacity-100";
  return (
    <section
      aria-label="cookie consent"
      className="hj-consent fixed inset-x-3 bottom-3 z-[60] sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-[360px]"
      style={{ background: DUNE, color: INK, clipPath: chamfer(16) }}
    >
      <div className="px-5 pb-5 pt-[18px]">
        <h2 className={`${display} text-[18px] leading-6 tracking-[-0.02em]`}>cookies, briefly.</h2>
        <p className="mt-2 text-[13px] leading-5 text-[#1f1f1f]/75">
          we&rsquo;d like to use analytics and session recordings to see how people use this page, and to recognise you when you come back. nothing runs unless you say yes.{" "}
          <a href={PRIVACY_HREF} className="text-[#1f1f1f] underline decoration-[#1f1f1f]/35 underline-offset-2 transition-colors hover:decoration-[#1f1f1f]">privacy policy</a>
        </p>
        {consent && <p className="mt-2 text-[12px] leading-[18px] text-[#1f1f1f]/55">right now: {consent === "granted" ? "accepted" : "declined"}.</p>}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => setConsent("granted")} className={btn} style={{ background: INK }}>accept</button>
          <button type="button" onClick={() => setConsent("denied")} className={btn} style={{ background: INK }}>decline</button>
        </div>
      </div>
    </section>
  );
}
