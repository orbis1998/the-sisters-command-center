import { createFileRoute, Navigate } from "@tanstack/react-router";

/** Legacy URL → transfert is now a tab under Dépenses. */
export const Route = createFileRoute("/manager-transfer")({
  component: () => <Navigate to="/manager-expenses" replace />,
});
