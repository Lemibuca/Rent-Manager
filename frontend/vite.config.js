// frontend/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pwa-192x192.png", "pwa-512x512.png"],

      manifest: {
        name: "Rent Manager",
        short_name: "RentManager",
        description: "Manage units, tenants, leases, invoices and payments.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#111111",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
        ],
      },

      devOptions: {
        enabled: true,           // keep PWA dev on localhost
        suppressWarnings: true,  // ✅ fixes the glob warning in dev
      },
    }),
  ],
});
