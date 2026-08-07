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

      {/* Ships disabled in B12b, enabled in B13 (LOCAL-STORE.md §8) — a
          button, not a Link, so it can never navigate; visibly dimmed so it
          doesn't read as broken. */}
      <div className="relative">
        <button
          type="button"
          disabled
          aria-disabled="true"
          aria-label="ไอเท็ม (เร็ว ๆ นี้)"
          className="size-11 rounded-full flex items-center justify-center text-muted-foreground/30 cursor-not-allowed"
        >
          <Shirt className="size-4" />
        </button>
        <span className="pointer-events-none absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-muted px-1.5 py-0.5 text-[8px] font-medium leading-none text-muted-foreground/80">
          เร็ว ๆ นี้
        </span>
      </div>

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
