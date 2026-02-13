import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Debug: Log when script starts
console.log("[AutoInvoice] main.tsx loaded");

const rootElement = document.getElementById("root");
console.log("[AutoInvoice] Root element:", rootElement);

if (!rootElement) {
  console.error("[AutoInvoice] FATAL: Root element not found!");
  document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: Root element not found</div>';
} else {
  try {
    console.log("[AutoInvoice] Creating React root...");
    const root = ReactDOM.createRoot(rootElement);
    console.log("[AutoInvoice] Rendering App...");
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
    console.log("[AutoInvoice] App rendered successfully");
  } catch (error) {
    console.error("[AutoInvoice] FATAL: Failed to render App:", error);
    document.body.innerHTML = `<div style="padding: 20px; color: red;">
      <h2>Render Error</h2>
      <pre>${error}</pre>
    </div>`;
  }
}
