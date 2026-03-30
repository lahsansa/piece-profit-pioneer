import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useLang } from "@/hooks/use-lang";
import { Link, useNavigate } from "react-router-dom";
import {
  Wallet,
  ArrowDownToLine,
  CreditCard,
  UserCog,
  Globe,
  Landmark,
  Download,
  Search,
  User,
  Shield,
  LogOut,
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const navigate = useNavigate();
  const [searchDate, setSearchDate] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [storeData, setStoreData] = useState({
    store_level: "Small shop",
    balance: 0,
    total_topup: 0,
    total_profit: 0,
  });

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setUserEmail(user.email || "");
      setUserId(user.id.slice(0, 8).toUpperCase());

      // Check admin role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (roles && roles.some((r: any) => r.role === "admin")) {
        setIsAdmin(true);
      }

      // Load store data
      const { data: store } = await supabase
        .from("user_stores")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (store) {
        setStoreData({
          store_level: store.store_level,
          balance: Number(store.balance),
          total_topup: Number(store.total_topup),
          total_profit: Number(store.total_profit),
        });
      }
    };
    loadUserData();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const storeLevelAr: Record<string, string> = {
    "Small shop": "متجر صغير",
    "Medium shop": "متجر متوسط",
    "Large shop": "متجر كبير",
  };

  const quickActions = [
    { label: isAr ? "شحن" : "Recharge", icon: Wallet, color: "text-primary", bg: "bg-primary/10", to: "/topup" },
    { label: isAr ? "سحب" : "Withdrawal", icon: ArrowDownToLine, color: "text-profit", bg: "bg-profit/10", to: null },
    { label: isAr ? "محفظتي" : "My Wallet", icon: CreditCard, color: "text-orange-500", bg: "bg-orange-500/10", to: null },
    { label: isAr ? "حسابي" : "Account", icon: UserCog, color: "text-purple-500", bg: "bg-purple-500/10", to: null },
  ];

  const storeStats = [
    { label: isAr ? "إجمالي الشحن" : "Total Topup", value: storeData.total_topup.toFixed(2) },
    { label: isAr ? "إجمالي الأرباح" : "Total Profit", value: storeData.total_profit.toFixed(2) },
  ];

  const bottomLinks = [
    { label: isAr ? "الموقع الرسمي" : "Official Website", icon: Globe },
    { label: isAr ? "قرض" : "Loan", icon: Landmark },
    { label: isAr ? "تحميل" : "Download", icon: Download },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header bar */}
      <div className="bg-primary text-primary-foreground px-4 py-3 pt-16 text-center flex items-center justify-between">
        <p className="text-sm font-medium flex-1 text-center">
          {isAr ? "مستوى المتجر" : "Position"}:{" "}
          <span className="font-bold">{isAr ? (storeLevelAr[storeData.store_level] || storeData.store_level) : storeData.store_level}</span>
        </p>
        <Button variant="ghost" size="icon" onClick={handleLogout} className="text-primary-foreground">
          <LogOut className="w-5 h-5" />
        </Button>
      </div>

      <div className="max-w-md mx-auto px-4 py-5 space-y-5">
        {/* Admin link */}
        {isAdmin && (
          <Link to="/admin">
            <Card className="shadow-md border-0 bg-destructive/10 cursor-pointer hover:bg-destructive/20 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <Shield className="w-5 h-5 text-destructive" />
                <span className="text-sm font-bold text-destructive">
                  {isAr ? "لوحة تحكم المشرف" : "Go to Admin Dashboard"}
                </span>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* User info card */}
        <Card className="shadow-md border-0 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="w-16 h-16 bg-muted">
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  <User className="w-8 h-8" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{isAr ? "رقم الحساب" : "Account ID"}</p>
                <p className="text-sm font-bold text-foreground">{userId}</p>
                <p className="text-xs text-muted-foreground mt-1">{isAr ? "البريد" : "Email"}</p>
                <p className="text-sm font-bold text-foreground truncate">{userEmail}</p>
                <p className="text-xs text-muted-foreground mt-1">{isAr ? "مستوى المتجر" : "Store Level"}</p>
                <p className="text-sm font-semibold text-primary">
                  {isAr ? (storeLevelAr[storeData.store_level] || storeData.store_level) : storeData.store_level}
                </p>
              </div>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">{isAr ? "رصيد المتجر" : "My Store Credit"}</p>
              <p className="text-3xl font-bold text-foreground">{storeData.balance.toFixed(2)} USDT</p>
            </div>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const content = (
              <div className="flex flex-col items-center gap-1.5 py-3 cursor-pointer">
                <div className={`w-12 h-12 rounded-2xl ${action.bg} flex items-center justify-center`}>
                  <action.icon className={`w-6 h-6 ${action.color}`} />
                </div>
                <span className="text-xs font-medium text-foreground text-center leading-tight">{action.label}</span>
              </div>
            );
            return action.to ? (
              <Link key={action.label} to={action.to}>{content}</Link>
            ) : (
              <div key={action.label}>{content}</div>
            );
          })}
        </div>

        {/* Store data */}
        <Card className="shadow-md border-0">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-bold text-foreground">{isAr ? "بيانات المتجر" : "Store Data"}</h3>
            {storeStats.map((stat) => (
              <div key={stat.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <span className="text-sm font-bold text-foreground">{stat.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Search by date */}
        <Card className="shadow-md border-0">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="flex-1"
              />
              <Button size="sm" className="bg-primary text-primary-foreground px-4">
                <Search className="w-4 h-4 mr-1" />
                {isAr ? "بحث" : "Search"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bottom links */}
        <div className="space-y-2">
          {bottomLinks.map((link) => (
            <Card key={link.label} className="shadow-sm border-0 cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <link.icon className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-foreground">{link.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
