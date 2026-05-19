import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { RootErrorBoundary } from "./components/shell/RootErrorBoundary";
import "./styles/tokens.css";
import "./styles/shell.css";
import "./App.css";

// Global runtime diagnostics — surface any uncaught render/async error
// so a blank-window symptom is never "silent". These listeners stay in
// production; the cost is negligible (two listeners, console.error on
// fire) and the benefit is concrete: if the RootErrorBoundary fallback
// itself fails to mount, the logs still pinpoint the cause.
if (typeof window !== "undefined") {
  window.addEventListener("error", (e) => {
    console.error(
      "[GlobalError] window.onerror:",
      e.message,
      "at",
      e.filename ?? "(unknown)",
      ":",
      e.lineno ?? 0,
      ":",
      e.colno ?? 0,
      e.error,
    );
  });
  window.addEventListener("unhandledrejection", (e) => {
    console.error(
      "[GlobalError] unhandledrejection:",
      e.reason,
    );
  });
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root missing from index.html");
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>,
);
