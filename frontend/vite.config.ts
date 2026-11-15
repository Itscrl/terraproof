import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";
export default defineConfig({
  define: { CESIUM_BASE_URL: JSON.stringify("/cesium") },
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: "node_modules/cesium/Build/Cesium/Workers",
          dest: "cesium",
          rename: { stripBase: 4 },
        },
        {
          src: "node_modules/cesium/Build/Cesium/Assets",
          dest: "cesium",
          rename: { stripBase: 4 },
        },
        {
          src: "node_modules/cesium/Build/Cesium/Widgets",
          dest: "cesium",
          rename: { stripBase: 4 },
        },
        {
          src: "node_modules/cesium/Build/Cesium/ThirdParty",
          dest: "cesium",
          rename: { stripBase: 4 },
        },
      ],
    }),
  ],
  server: { proxy: { "/api": "http://127.0.0.1:8000" } },
});
