import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConsentBanner } from "@/components/consent-banner";
import { DocPage } from "@/docs/doc-page";
import guide from "../docs/incorporation-guide.md?raw";
import "./lib/posthog";
import "./index.css";

// Entry for /incorporation-guide (incorporation-guide.html), linked from "incorporation guide" in the conditions.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DocPage title="incorporation guide" markdown={guide} wide />
    <ConsentBanner />
  </StrictMode>,
);
