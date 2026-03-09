import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
    pool: "forks",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/pages/LobbyPage.jsx", "src/pages/RoomPage.jsx", "src/state/appState.js"],
      exclude: ["src/pages/RoomPage.jsx"]
    }
  }
});
