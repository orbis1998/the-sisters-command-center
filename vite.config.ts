import { defineConfig } from "@lovable.dev/vite-tanstack-config";

/** Vercel/CI expose VITE_* via process.env; loadEnv alone only reads .env files. */
function buildViteEnvDefine(): Record<string, string> {
  const define: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith("VITE_") && value) {
      define[`import.meta.env.${key}`] = JSON.stringify(value);
    }
  }
  return define;
}

export default defineConfig({
  nitro: { preset: "vercel" },
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    define: buildViteEnvDefine(),
  },
});
