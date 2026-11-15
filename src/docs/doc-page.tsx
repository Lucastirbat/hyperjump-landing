import { useEffect, useMemo } from "react";
import { marked } from "marked";
import { openConsentSettings } from "@/lib/consent";
import { startSmoothScroll } from "@/lib/scroll";
import { cn } from "@/lib/utils";
import { chamferAll, DUNE, IGNITION, LINE } from "@/landing/parts";

/*
 * A text page (/privacy, /incorporation-guide): one Markdown file from docs/, set in the brand type on a
 * cream card in the landing's dark frame. The Markdown files are the only thing to edit.
 * `wide` gives wide comparison tables room on desktop (on phones, tables scroll sideways).
 */

const slug = (s: string) => s.toLowerCase().replace(/<[^>]+>/g, "").replace(/&[a-z]+;|&#\d+;/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Our own files, so their HTML is trusted. Headings get ids (for #links), tables a sideways-scrolling wrapper. */
function render(markdown: string) {
  return (marked.parse(markdown, { async: false }) as string)
    .replace(/<(h[23])>(.*?)<\/\1>/g, (_, tag: string, text: string) => `<${tag} id="${slug(text)}">${text}</${tag}>`)
    .replaceAll("<table>", '<div class="hj-table"><table>')
    .replaceAll("</table>", "</table></div>");
}

export function DocPage({ title, markdown, wide = false }: { title: string; markdown: string; wide?: boolean }) {
  useEffect(() => {
    document.title = `${title} · hyperjump`;
    return startSmoothScroll();
  }, [title]);
  const html = useMemo(() => render(markdown), [markdown]);

  const link = "text-[#bbbbb5] transition-colors hover:text-[#f5f3f0]";
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-50 h-14 border-b backdrop-blur-[8px] sm:h-[60px]" style={{ borderColor: LINE, background: "rgba(37,36,34,0.85)" }}>
        <div className="mx-auto flex h-full max-w-[1280px] items-stretch justify-between pl-3 pr-5 sm:px-10">
          <a href="/" aria-label="HyperJump home" className="flex w-[124px] items-center justify-center border-x sm:w-[180px]" style={{ background: IGNITION, borderColor: LINE }}>
            <img src="/landing/el/wordmark.svg" alt="" width={144} height={14} className="block w-[100px] sm:w-[144px]" />
          </a>
          <a href="/" className={`flex items-center text-[13px] leading-[21px] ${link}`}>back to hyperjump</a>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-3 py-8 sm:px-10 sm:py-16">
        <article
          className={cn("hj-prose mx-auto px-6 py-10 sm:px-14 sm:py-14", wide ? "is-wide max-w-[1200px]" : "max-w-[820px]")}
          style={{ background: DUNE, clipPath: chamferAll(16) }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </main>

      <footer className="border-t" style={{ borderColor: LINE }}>
        <div className="mx-auto flex max-w-[1280px] flex-wrap gap-x-6 gap-y-1 px-5 py-6 text-[13px] leading-[21px] sm:px-10">
          <span className="text-[#f5f3f0]">© hyperjump 2026</span>
          <a href="/" className={link}>home</a>
          <a href="/privacy" className={link}>privacy policy</a>
          <button type="button" onClick={openConsentSettings} className={link}>cookie settings</button>
        </div>
      </footer>
    </div>
  );
}
