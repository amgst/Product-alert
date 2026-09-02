import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = realpathSync(fileURLToPath(new URL(".", import.meta.url)));

export default defineConfig({
  root,
  plugins: [reactRouter()],
});
