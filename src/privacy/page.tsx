import { useEffect, useMemo } from "react";
import { marked } from "marked";
import policy from "../../docs/privacy-policy.md?raw";
import { openConsentSettings } from "@/lib/consent";
import { startSmoothScroll } from "@/lib/scroll";
import { chamferAll, DUNE, IGNITION, LINE } from "@/landing/parts";

/*
 * /privacy: the privacy policy, rendered from docs/privacy-policy.md (the one text to edit), on a cream
 * card in the landing's dark frame.
 */

export function PrivacyPage() {
  useEffect(() => {
    document.title = "privacy policy · hyperjump";
    return startSmoothScroll();
  }, []);

  // our own file, so its HTML is trusted; tables get a wrapper that scrolls sideways on phones
  const html = useMemo(
    () => (marked.parse(policy, { async: false }) as string).replaceAll("<table>", '<div class="hj-table"><table>').replaceAll("</table>", "</table></div>"),
    [],
  );

  const link = "text-[#bbbbb5] transition-colors hover:text-[#f5f3f0]";
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-50 h-14 border-b backdrop-blur-[8px] sm:h-[60px]" style={{ borderColor: LINE, background: "rgba(37,36,34,0.85)" }}>
        <div className="mx-auto flex h-full max-w-[1120px] items-stretch justify-between pl-3 pr-5 sm:px-10">
          <a href="/" aria-label="HyperJump home" className="flex w-[124px] items-center justify-center border-x sm:w-[180px]" style={{ background: IGNITION, borderColor: LINE }}>
            <img src="/landing/el/wordmark.svg" alt="" width={144} height={14} className="block w-[100px] sm:w-[144px]" />
          </a>
          <a href="/" className={`flex items-center text-[13px] leading-[21px] ${link}`}>back to hyperjump</a>
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] px-3 py-8 sm:px-10 sm:py-16">
        <article
          className="hj-prose mx-auto max-w-[820px] px-6 py-10 sm:px-14 sm:py-14"
          style={{ background: DUNE, clipPath: chamferAll(16) }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </main>

      <footer className="border-t" style={{ borderColor: LINE }}>
        <div className="mx-auto flex max-w-[1120px] flex-wrap gap-x-6 gap-y-1 px-5 py-6 text-[13px] leading-[21px] sm:px-10">
          <span className="text-[#f5f3f0]">© hyperjump 2026</span>
          <a href="/" className={link}>home</a>
          <button type="button" onClick={openConsentSettings} className={link}>cookie settings</button>
        </div>
      </footer>
    </div>
  );
}
