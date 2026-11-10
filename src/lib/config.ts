/** The HyperJump platform (sign-in, applications, API). Set VITE_APP_URL at build time to change it. */
export const APP_URL = (import.meta.env.VITE_APP_URL || "https://hyperjump.dev").replace(/\/+$/, "");

/** Where "apply" and "sign in" go. `jump=1` tells the platform to finish the hyperspace jump on arrival. */
export const SIGN_IN_URL = `${APP_URL}/sign-in?jump=1`;

/** API base: same-origin /api in dev (proxied by Vite), the platform in production. */
export const API_URL = import.meta.env.DEV ? "" : APP_URL;
