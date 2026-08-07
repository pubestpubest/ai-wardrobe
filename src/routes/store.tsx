import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout-only. TanStack's flat-file router nests any `store.*.tsx` sibling
// (store.register.tsx, store.package.tsx) under this file the moment it
// exists — so this route contributes no UI of its own, just the Outlet that
// lets those children render. The actual /store page content lives in
// store.index.tsx.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createFileRoute as any)("/store")({
  component: () => <Outlet />,
});
