/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/shixu-canben/" : "/",
  plugins: [react(), tailwindcss()],
  // Vite 8 原生支持读 tsconfig 的 paths 做别名解析，无需 vite-tsconfig-paths 插件
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    globals: false,
    include: ["test/**/*.test.{ts,tsx}"],
    setupFiles: ["test/setup.ts"],
    coverage: { reporter: [] },
  },
}));
