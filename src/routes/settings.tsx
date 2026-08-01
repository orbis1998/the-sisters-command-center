import { createFileRoute, Navigate } from "@tanstack/react-router";

/** Legacy URL — paramètres retirés. */
export const Route = createFileRoute("/settings")({
  component: () => <Navigate to="/" replace />,
});
