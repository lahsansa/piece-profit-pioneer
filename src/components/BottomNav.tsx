import { useLocation, Link } from "react-router-dom";
import { Home, Newspaper, ShoppingBag, Users, ClipboardList, User, Wallet, MessageCircle } from "lucide-react";
import { useLang } from "@/hooks/use-lang";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { to: "/", icon: Home, label: "Home", labelAr: "الرئيسية" },
  { to: "/news", icon: Newspaper, label: "News", labelAr: "أخبار" },
  { to: "/store-levels", icon: ShoppingBag, label: "Buyout", labelAr: "شراء" },
  { to: "/topup", icon: Wallet, label: "Topup", labelAr: "شحن" },
  { to: "/team", icon: Users, label: "Team", labelAr: "فريق" },
  { to: "/chat", icon: MessageCircle, label: "Chat", labelAr: "دردشة" },
  { to: "/invest", icon: ClipboardList, label: "Invest", labelAr: "استثمر" },
  { to: "/dashboard", icon: User, label: "User", labelAr: "مستخدم" },
];

const BottomNav = () => {
  const location = useLocation();
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadUnread = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("sender", "admin")
        .eq("read", false);

      setUnreadCount(count || 0);
    };

    loadUnread();

    // Real-time
    const channel = supabase.channel("bottomnav-unread")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "messages",
      }, () => { loadUnread(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Reset unread when on chat page
  useEffect(() => {
    if (location.pathname === "/chat") setUnreadCount(0);
  }, [location.pathname]);

  if (location.pathname === "/admin") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div className="max-w-md mx-auto grid grid-cols-8 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const isChat = item.to === "/chat";
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 py-1 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              <div className="relative">
                <item.icon className="w-5 h-5" />
                {isChat && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{isAr ? item.labelAr : item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;