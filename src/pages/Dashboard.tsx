import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useLang } from "@/hooks/use-lang";
import { Link, useNavigate } from "react-router-dom";
import {
  Wallet, ArrowDownToLine, CreditCard, UserCog,
  Globe, Landmark, Download, Search, User, Shield, LogOut, Copy, Check,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const generateReferralCode = () => Math.random().toString(36).substring(2, 10).toUpperCase();

const PROFIT_PER_SECOND: Record<string, number> = {
  "Small shop":  11.5  / 86400,
  "Medium shop": 39    / 86400,
  "Large shop":  92    / 86400,
  "Mega shop":   135   / 86400,
  "VIP":         220   / 86400,
};

const PACK_PRICE: Record<string, number> = {
  "Small shop":  92,
  "Medium shop": 320,
  "Large shop":  700,
  "Mega shop":   1000,
  "VIP":         1500,
};

const Dashboard = () => {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const navigate = useNavigate();
  const [searchDate, setSearchDate] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [storeData, setStoreData] = useState({
    store_level: "Small shop",
    balance: 0,
    total_topup: 0,
    total_profit: 0,
    team_earnings: 0,
  });
  const [liveProfit, setLiveProfit] = useState(0);
  const [liveBalance, setLiveBalance] = useState(0);
  const lastSaveRef = useRef<Date>(new Date());
  const storeDataRef = useRef(storeData);
  const liveProfitRef = useRef(0);
  const liveBalanceRef = useRef(0);
  const userIdRef = useRef("");

  useEffect(() => { storeDataRef.current = storeData; }, [storeData]);
  useEffect(() => { liveProfitRef.current = liveProfit; }, [liveProfit]);
  useEffect(() => { liveBalanceRef.current = liveBalance; }, [liveBalance]);

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      userIdRef.current = user.id;
      setUserEmail(user.email || "");
      setUserId(user.id.slice(0, 8).toUpperCase());

      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (roles && roles.some((r: any) => r.role === "admin")) setIsAdmin(true);

      let { data: store } = await supabase.from("user_stores").select("*").eq("user_id", user.id).maybeSingle();

      if (!store) {
        const newCode = generateReferralCode();
        const { data: newStore } = await supabase.from("user_stores").insert({
          user_id: user.id,
          referral_code: newCode,
          store_level: "Small shop",
          balance: 0,
          total_topup: 0,
          total_profit: 0,
          team_earnings: 0,
          last_profit_update: new Date().toISOString(),
        }).select().single();
        store = newStore;
      }

      if (store && !store.referral_code) {
        const newCode = generateReferralCode();
        await supabase.from("user_stores").update({ referral_code: newCode }).eq("user_id", user.id);
        store.referral_code = newCode;
      }

      if (store) {
        setReferralCode(store.referral_code || "");
        const profit = Number(store.total_profit);
        const balance = Number(store.balance);
        setLiveProfit(profit);
        setLiveBalance(balance);
        lastSaveRef.current = new Date(store.last_profit_update || new Date());
        setStoreData({
          store_level: store.store_level,
          balance: balance,
          total_topup: Number(store.total_topup),
          total_profit: profit,
          team_earnings: Number(store.team_earnings || 0),
        });
      }
    };
    loadUserData();
  }, [navigate]);

  // Real-time profit + balance ticker
  useEffect(() => {
    const interval = setInterval(() => {
      const level = storeDataRef.current.store_level;
      const topup = storeDataRef.current.total_topup;
      const packPrice = PACK_PRICE[level] || 92;
      const currentBalance = liveBalanceRef.current;

      // Only earn if topup done AND balance >= pack price
      if (topup <= 0 || currentBalance < packPrice) return;

      const perSecond = PROFIT_PER_SECOND[level] || PROFIT_PER_SECOND["Small shop"];

      setLiveProfit(prev => {
        const newProfit = prev + perSecond;
        liveProfitRef.current = newProfit;
        return newProfit;
      });

      setLiveBalance(prev => {
        const newBalance = prev + perSecond;
        liveBalanceRef.current = newBalance;
        return newBalance;
      });

      // Save to database every minute
      const now = new Date();
      const secondsSinceLastSave = (now.getTime() - lastSaveRef.current.getTime()) / 1000;
      if (secondsSinceLastSave >= 1 && userIdRef.current) {
        lastSaveRef.current = now;
        supabase.from("user_stores").update({
          total_profit: liveProfitRef.current,
          balance: liveBalanceRef.current,
          last_profit_update: now.toISOString(),
        }).eq("user_id", userIdRef.current);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    if (userIdRef.current && storeDataRef.current.total_topup > 0) {
      await supabase.from("user_stores").update({
        total_profit: liveProfitRef.current,
        balance: liveBalanceRef.current,
        last_profit_update: new Date().toISOString(),
      }).eq("user_id", userIdRef.current);
    }
    await supabase.auth.signOut();
    navigate("/login");
  };

  const referralLink = `${window.location.origin}/login?ref=${referralCode}`;

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    toast.success("تم نسخ رمز الدعوة!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    toast.success("تم نسخ رابط الدعوة!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const storeLevelAr: Record<string, string> = {
    "Small shop": "متجر صغير",
    "Medium shop": "متجر متوسط",
    "Large shop": "متجر كبير",
    "Mega shop": "متجر ميغا",
    "VIP": "VIP",
  };

  const quickActions = [
    { label: isAr ? "شحن" : "Recharge", icon: Wallet, color: "text-primary", bg: "bg-primary/10", to: "/topup" },
    { label: isAr ? "سحب" : "Withdrawal", icon: ArrowDownToLine, color: "text-profit", bg: "bg-profit/10", to: "/withdraw" },
    { label: isAr ? "محفظتي" : "My Wallet", icon: CreditCard, color: "text-orange-500", bg: "bg-orange-500/10", to: null },
    { label: isAr ? "حسابي" : "Account", icon: UserCog, color: "text-purple-500", bg: "bg-purple-500/10", to: null },
  ];

  const bottomLinks = [
    { label: isAr ? "الموقع الرسمي" : "Official Website", icon: Globe },
    { label: isAr ? "قرض" : "Loan", icon: Landmark },
    { label: isAr ? "تحميل" : "Download", icon: Download },
  ];

  const packActive = storeData.total_topup > 0 && liveBalance >= (PACK_PRICE[storeData.store_level] || 92);

  return (
    <div className="min-h-screen bg-background pb-24">
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
        {isAdmin && (
          <Link to="/admin">
            <Card className="shadow-md border-0 bg-destructive/10 cursor-pointer hover:bg-destructive/20 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <Shield className="w-5 h-5 text-destructive" />
                <span className="text-sm font-bold text-destructive">{isAr ? "لوحة تحكم المشرف" : "Go to Admin Dashboard"}</span>
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
            {/* Live balance */}
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">{isAr ? "رصيد المتجر" : "My Store Credit"}</p>
              <p className="text-3xl font-bold text-foreground tabular-nums">{liveBalance.toFixed(6)} USDT</p>
              {packActive && <p className="text-xs text-green-500 mt-1">📈 {isAr ? "الربح يتزاد الآن" : "Earning now..."}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Referral Card */}
        {referralCode && (
          <Card className="shadow-md border-0 bg-primary text-primary-foreground">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm opacity-80">{isAr ? "رمز الدعوة" : "Referral Code"}</span>
                <span className="text-xl font-bold tracking-widest font-mono">{referralCode}</span>
                <Button size="sm" variant="secondary" onClick={copyCode} className="h-8 px-3">
                  {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span className="mr-1 text-xs">{isAr ? "نسخ" : "Copy"}</span>
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs opacity-70 truncate flex-1">{referralLink}</span>
                <Button size="sm" variant="secondary" onClick={copyLink} className="h-8 px-3 flex-shrink-0">
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span className="mr-1 text-xs">{isAr ? "نسخ" : "Copy"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
            return action.to ? <Link key={action.label} to={action.to}>{content}</Link> : <div key={action.label}>{content}</div>;
          })}
        </div>

        {/* Store data */}
        <Card className="shadow-md border-0">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-bold text-foreground">{isAr ? "بيانات المتجر" : "Store Data"}</h3>

            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">{isAr ? "إجمالي الشحن" : "Total Topup"}</span>
              <span className="text-sm font-bold">{storeData.total_topup.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">{isAr ? "إجمالي الأرباح" : "Total Profit"}</span>
              <span className="text-sm font-bold text-green-500 tabular-nums">
                {storeData.total_topup > 0 ? liveProfit.toFixed(6) : "0.000000"}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">{isAr ? "أرباح الفريق" : "Team Earnings"}</span>
              <span className="text-sm font-bold">{storeData.team_earnings.toFixed(2)}</span>
            </div>

            {/* Pack status */}
            {storeData.total_topup > 0 && (
              packActive ? (
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-green-600 font-medium">
                    📈 {isAr ? "معدل الربح اليومي" : "Daily rate"}:{" "}
                    <span className="font-bold">~${((PROFIT_PER_SECOND[storeData.store_level] || 0) * 86400).toFixed(2)}/day</span>
                  </p>
                  <p className="text-xs text-green-500 mt-1">✅ {isAr ? "الباقة نشطة" : "Pack is active"}</p>
                </div>
              ) : (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-orange-600 font-bold">
                    ⚠️ {isAr ? "الرصيد غير كافٍ لتفعيل الباقة" : "Insufficient balance to activate pack"}
                  </p>
                  <p className="text-xs text-orange-500 mt-1">
                    {isAr ? "تحتاج" : "You need"}{" "}
                    <span className="font-bold">${PACK_PRICE[storeData.store_level] || 92}</span>
                    {" "}{isAr ? "لتفعيل" : "to activate"} {storeData.store_level}
                  </p>
                  <Link to="/topup" className="inline-block mt-2 bg-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                    {isAr ? "أكمل الشحن" : "Top up now"} →
                  </Link>
                </div>
              )
            )}
          </CardContent>
        </Card>

        {/* Search by date */}
        <Card className="shadow-md border-0">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input type="date" value={searchDate} onChange={(e) => setSearchDate(e.target.value)} className="flex-1" />
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