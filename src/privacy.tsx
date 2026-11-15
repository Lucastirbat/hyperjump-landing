import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConsentBanner } from "@/components/consent-banner";
import { PrivacyPage } from "@/privacy/page";
import "./lib/posthog";
import "./index.css";

// Entry for /privacy (privacy.html): the policy page and the cookie banner, without the landing's 3D.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PrivacyPage />
    <ConsentBanner />
  </StrictMode>,
);
