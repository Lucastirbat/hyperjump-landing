/*
 * Lifts the preloader (index.html #hj-boot) once the brand fonts and the first images are in, so nothing
 * pops in. Never waits longer than MAX_MS; stays up at least MIN_MS so it doesn't just flash.
 */
const MIN_MS = 300, MAX_MS = 4000;

const FONTS = ['400 16px "Syne Variable"', '300 16px "DM Sans Variable"', '400 16px "DM Sans Variable"', '500 16px "DM Sans Variable"', '400 16px "Orbitron Variable"'];

export function liftPreloader() {
  const boot = document.getElementById("hj-boot");
  const done = () => {
    document.documentElement.classList.remove("hj-booting");
    if (!boot) return;
    boot.classList.add("done");
    window.setTimeout(() => boot.remove(), 600);
  };
  if (!boot) { done(); return; }
  const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
  const fonts = Promise.all(FONTS.map((f) => document.fonts.load(f))).then(() => document.fonts.ready).catch(() => undefined);
  const page = document.readyState === "complete" ? Promise.resolve() : new Promise<void>((r) => window.addEventListener("load", () => r(), { once: true }));
  void Promise.race([Promise.all([fonts, page, wait(MIN_MS)]), wait(MAX_MS)]).then(() => requestAnimationFrame(() => requestAnimationFrame(done)));
}
