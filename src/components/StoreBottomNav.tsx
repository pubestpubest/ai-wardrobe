import { Link, useRouterState, type LinkProps } from "@tanstack/react-router";
import { Store, Shirt, Wallet } from "lucide-react";

// Store accounts get their own three-tab shell (LOCAL-STORE.md §2) — no
// โปรไฟล์ tab, since a shop has no personal profile: the store profile is
// tab 1, and /profile is unreachable under __root's redirect guard anyway.
export function StoreBottomNav() {
  // Normalize the trailing slash so /store/ still highlights its tab, matching
  // StoreGuard's isStorePath.
  const norm = (p: string) => p.replace(/\/+$/, "") || "/";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 glass rounded-full border border-border px-2 py-2 flex items-center gap-1 shadow-lg z-40">
      <NavLink to="/store" icon={Store} active={norm(pathname) === "/store"} />
      <NavLink to="/store/items" icon={Shirt} active={norm(pathname) === "/store/items"} />
      <NavLink to="/store/package" icon={Wallet} active={norm(pathname) === "/store/package"} />
    </nav>
  );
}

function NavLink({
  to,
  icon: Icon,
  active,
}: {
  to: LinkProps["to"];
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={`size-11 rounded-full flex items-center justify-center transition duration-200 active:scale-90 ${
        active
          ? "bg-lilac text-lilac-foreground scale-105"
          : "text-muted-foreground hover:bg-muted hover:scale-105"
      }`}
    >
      <Icon className="size-4" />
    </Link>
  );
}
