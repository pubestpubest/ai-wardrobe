import { Link, useRouterState, type LinkProps } from "@tanstack/react-router";
import { Home, Shirt, Plus, ShoppingBag, Heart, User } from "lucide-react";

export function BottomNav({ onUpload }: { onUpload?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 glass rounded-full border border-border px-2 py-2 flex items-center gap-1 shadow-lg z-40">
      <NavLink to="/" icon={Home} active={pathname === "/"} />
      <NavLink to="/wardrobe" icon={Shirt} active={pathname === "/wardrobe"} />
      <button
        onClick={onUpload}
        className="size-11 rounded-full flex items-center justify-center bg-primary text-primary-foreground scale-110 transition hover:scale-115 active:scale-100 shadow-md shadow-primary/30"
      >
        <Plus className="size-4" />
      </button>
      <NavLink to="/discover" icon={ShoppingBag} active={pathname === "/discover"} />
      <NavLink to="/matches" icon={Heart} active={pathname === "/matches"} />
      <NavLink to="/profile" icon={User} active={pathname === "/profile"} />
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
