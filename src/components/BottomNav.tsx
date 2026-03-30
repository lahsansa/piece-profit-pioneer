import { useLocation, Link } from "react-router-dom";
import { Home, Newspaper, ShoppingBag, Users, ClipboardList, User, Wallet } from "lucide-react";
import { useLang } from "@/hooks/use-lang";

const navItems = [
  { to: "/", icon: Home, label: "Home", labelAr: "الرئيسية" },
  { to: "/news", icon: Newspaper, label: "News", labelAr: "أخبار" },
  { to: "/store-levels", icon: ShoppingBag, label: "Buyout", labelAr: "شراء" },
  { to: "/topup", icon: Wallet, label: "Topup", labelAr: "شحن" },
  { to: "/team", icon: Users, label: "Team", labelAr: "فريق" },
  { to: "/invest", icon: ClipboardList, label: "Invest", labelAr: "استثمر" },
  { to: "/dashboard", icon: User, label: "User", labelAr: "مستخدم" },
];

const BottomNav = () => {
  const location = useLocation();
  const { lang } = useLang();
  const isAr = lang === "ar";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div className="max-w-md mx-auto grid grid-cols-7 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 py-1 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{isAr ? item.labelAr : item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
