/** Safe id for client + SSR (avoids crypto.randomUUID crashes in some runtimes). */
export function newId() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
