import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConsentBanner } from "@/components/consent-banner";
import { DocPage } from "@/docs/doc-page";
import policy from "../docs/privacy-policy.md?raw";
import "./lib/posthog";
import "./index.css";

// Entry for /privacy (privacy.html): the policy and the cookie banner, without the landing's 3D.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DocPage title="privacy policy" markdown={policy} />
    <ConsentBanner />
  </StrictMode>,
);
