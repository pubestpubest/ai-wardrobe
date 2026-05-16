import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Shirt, Plus, Heart, User } from "lucide-react";

export function BottomNav({ onUpload }: { onUpload?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 glass rounded-full border border-border px-2 py-2 flex items-center gap-1 shadow-lg z-40">
      <NavLink to="/" icon={Home} active={pathname === "/"} />
      <NavLink to="/wardrobe" icon={Shirt} active={pathname === "/wardrobe"} />
      <button
        onClick={onUpload}
        className="size-11 rounded-full flex items-center justify-center bg-primary text-primary-foreground scale-110 transition"
      >
        <Plus className="size-4" />
      </button>
      <button className="size-11 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition">
        <Heart className="size-4" />
      </button>
      <button className="size-11 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition">
        <User className="size-4" />
      </button>
    </nav>
  );
}

function NavLink({ to, icon: Icon, active }: { to: string; icon: React.ElementType; active: boolean }) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Link
      to={to as any}
      className={`size-11 rounded-full flex items-center justify-center transition ${
        active ? "bg-lilac text-lilac-foreground" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      <Icon className="size-4" />
    </Link>
  );
}
