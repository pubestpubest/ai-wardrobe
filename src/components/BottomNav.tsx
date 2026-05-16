import { Home, Shirt, Plus, Heart, User } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";

export function BottomNav({ onPlusClick }: { onPlusClick?: () => void }) {
  const location = useLocation();
  const pathname = location.pathname;

  const navItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Shirt, label: "Wardrobe", href: "/wardrobe" },
    { icon: Plus, label: "Add", primary: true, onClick: onPlusClick },
    { icon: Heart, label: "Favorites", href: "/favorites" },
    { icon: User, label: "Profile", href: "/profile" },
  ];

  return (
    <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 glass rounded-full border border-border px-2 py-2 flex items-center gap-1 shadow-lg z-50">
      {navItems.map((item, i) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        if (item.primary) {
          return (
            <button
              key={i}
              onClick={item.onClick}
              className="size-11 rounded-full flex items-center justify-center transition bg-primary text-primary-foreground scale-110 shadow-md"
            >
              <Icon className="size-4" />
            </button>
          );
        }

        return (
          <Link
            key={i}
            to={item.href as any}
            className={`size-11 rounded-full flex items-center justify-center transition ${
              isActive
                ? "bg-lilac text-lilac-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Icon className="size-4" />
          </Link>
        );
      })}
    </nav>
  );
}
