import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HyperspaceProvider } from "@/components/hyperspace";
import { LandingPage } from "@/landing/landing";
import { liftPreloader } from "./boot";
import "./index.css";

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <HyperspaceProvider>
        <LandingPage />
      </HyperspaceProvider>
    </QueryClientProvider>
  </StrictMode>,
);

liftPreloader();
