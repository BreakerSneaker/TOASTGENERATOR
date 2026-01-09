import { defineConfig } from "vite";

export default defineConfig({
  base: "/REPO_NAME/",
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
