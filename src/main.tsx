import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "@/App";
import AppProviders from "@/app/providers/AppProviders";

import "@/styles/reset.css";
import "@/styles/variables.css";
import "@/styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>
);