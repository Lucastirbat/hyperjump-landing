import posthog from "posthog-js";

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST;
const isPosthogConfigured = Boolean(posthogKey && posthogHost);

/** Dedicated PostHog Logs emitter; existing application logging remains local. */
export const posthogLogger = {
  info(message: string, attributes?: Parameters<typeof posthog.logger.info>[1]) {
    if (isPosthogConfigured) posthog.logger.info(message, attributes);
  },
};

if (isPosthogConfigured) {
  posthog.init(posthogKey!, {
    api_host: posthogHost!,
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
  posthogLogger.info("landing_page_initialized", { runtime: "browser" });
} else if (import.meta.env.DEV) {
  const missingVariable = posthogKey ? "VITE_POSTHOG_HOST" : "VITE_POSTHOG_KEY";
  throw new Error(`${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`);
}

export default posthog;
