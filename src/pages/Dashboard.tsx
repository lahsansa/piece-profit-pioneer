import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowDownToLine, Bell, Check, Copy, CreditCard, Download,
  Globe, Landmark, LogOut, MessageCircle, Search, Shield, User, UserCog, Wallet, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLang } from "@/hooks/use-lang";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const generateReferralCode = () => Math.random().toString(36).substring(2, 10).toUpperCase();

// Profit per second based on store_level (new rates)
const PROFIT_PER_SECOND: Record<string, number> = {
  "Small shop": 2.8 / 86400,
  "Medium shop": 11 / 86400,
  "Large shop": 24 / 86400,
  "Mega shop": 36 / 86400,
  VIP: 55 / 86400,
};

// Get profit rate based on total_topup (old packs keep old rates, new packs get new rates)
const getProfitPerSecond = (totalTopup: number, storeLevel: string): number => {
  const t = Number(totalTopup);
  // New packs (exact amounts)
  if (t === 2200) return 78 / 86400;
  if (t === 1650) return 55 / 86400;
  if (t === 1100) return 36 / 86400;
  if (t === 750)  return 24 / 86400;
  if (t === 350)  return 11 / 86400;
  if (t === 99)   return 2.8 / 86400;
  if (t === 45)   return 1.2 / 86400;
  // Old packs (keep original rates)
  if (t >= 2000) return 300 / 86400;
  if (t >= 1500) return 180 / 86400;
  if (t >= 1000) return 110 / 86400;
  if (t >= 700)  return 75 / 86400;
  if (t >= 320)  return 32 / 86400;
  if (t >= 92)   return 9.5 / 86400;
  return PROFIT_PER_SECOND[storeLevel] || 1.2 / 86400;
};

const PACK_PRICE: Record<string, number> = {
  "Small shop": 92,
  "Medium shop": 320,
  "Large shop": 700,
  "Mega shop": 1000,
  VIP: 1500,
};

type StoreData = {
  store_level: string;
  balance: number;
  total_topup: number;
  total_profit: number;
  team_earnings: number;
};

const INITIAL_STORE: StoreData = {
  store_level: "Small shop",
  balance: 0,
  total_topup: 0,
  total_profit: 0,
  team_earnings: 0,
};

const Dashboard = () => {
  const { lang, dir } = useLang();
  const isAr = lang === "ar";
  const navigate = useNavigate();

  const impersonateId = new URLSearchParams(window.location.search).get("impersonate");
  const isImpersonating = !!impersonateId;

  const [searchDate, setSearchDate] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [storeData, setStoreData] = useState<StoreData>(INITIAL_STORE);
  const [liveProfit, setLiveProfit] = useState(0);
  const [liveBalance, setLiveBalance] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  const [withdrawWindowOpen, setWithdrawWindowOpen] = useState(false);
  const [withdrawCountdown, setWithdrawCountdown] = useState("");
  const [withdrawNextOpen, setWithdrawNextOpen] = useState("");
  const storeDataRef = useRef<StoreData>(INITIAL_STORE);
  const liveProfitRef = useRef(0);
  const liveBalanceRef = useRef(0);
  const userIdRef = useRef("");
  const lastTickRef = useRef(Date.now());

  useEffect(() => { storeDataRef.current = storeData; }, [storeData]);

  useEffect(() => {
    const loadUserData = async () => {
      // Impersonate support
      if (isImpersonating) {
        setUserEmail(`👁️ عرض حساب: ${impersonateId!.slice(0, 8).toUpperCase()}`);
        setUserId(impersonateId!.slice(0, 8).toUpperCase());
        userIdRef.current = "";
        const { data: store } = await supabase.from("user_stores").select("*").eq("user_id", impersonateId).maybeSingle();
        if (store) {
          setReferralCode(store.referral_code || "");
          setStoreData({
            store_level: store.store_level || "Small shop",
            balance: Number(store.balance || 0),
            total_topup: Number(store.total_topup || 0),
            total_profit: Number(store.total_profit || 0),
            team_earnings: Number(store.team_earnings || 0),
          });
          setLiveBalance(Number(store.balance || 0));
          setLiveProfit(Number(store.total_profit || 0));
          liveProfitRef.current = Number(store.total_profit || 0);
          liveBalanceRef.current = Number(store.balance || 0);
        }
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      userIdRef.current = user.id;
      setUserEmail(user.email || "");
      setUserId(user.id.slice(0, 8).toUpperCase());

      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      setIsAdmin(Boolean(roles?.some((r: any) => r.role === "admin")));

      let { data: store } = await supabase.from("user_stores").select("*").eq("user_id", user.id).maybeSingle();

      // Check if blocked
      if (store?.is_blocked) {
        const blockedUntil = store.blocked_until ? new Date(store.blocked_until) : null;
        if (!blockedUntil || blockedUntil > new Date()) {
          // Still blocked — show message but allow topup
          setIsBlocked(true);
        } else {
          // Temp block expired — auto unblock
          await supabase.from("user_stores").update({ is_blocked: false, blocked_since: null, blocked_until: null } as any).eq("user_id", user.id);
        }
      }

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
        } as any).select().single();
        store = newStore;
      }

      if (store && !store.referral_code) {
        const newCode = generateReferralCode();
        await supabase.from("user_stores").update({ referral_code: newCode } as any).eq("user_id", user.id);
        store.referral_code = newCode;
      }

      if (!store) return;

      setReferralCode(store.referral_code || "");
      const dbBalance = Number(store.balance || 0);
      const dbProfit = Number(store.total_profit || 0);

      // Just read from DB — cron job handles profit calculation
      setStoreData({
        store_level: store.store_level || "Small shop",
        balance: dbBalance,
        total_topup: Number(store.total_topup || 0),
        total_profit: dbProfit,
        team_earnings: Number(store.team_earnings || 0),
      });
      setLiveBalance(dbBalance);
      setLiveProfit(dbProfit);
      liveProfitRef.current = dbProfit;
      liveBalanceRef.current = dbBalance;
      lastTickRef.current = Date.now();

      // Load notifications
      const { data: notifs } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (notifs) setNotifications(notifs);

      // Real-time notifications
      supabase.channel("user-notifications")
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "notifications",
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          const n = payload.new as any;
          setNotifications(prev => [n, ...prev]);
          toast(n.message, { duration: 6000 });
        })
        .subscribe();
    };
    loadUserData();
  }, [navigate]);

  // Check withdrawal window
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const checkWindow = async () => {
      const { data } = await supabase.from("withdrawal_settings").select("*").eq("id", 1).single();
      if (!data) return;
      if (data.is_open && data.opened_at) {
        const openedAt = new Date(data.opened_at);
        const closeAt = new Date(openedAt.getTime() + (data.window_minutes || 150) * 60000);
        const now = new Date();
        if (now < closeAt) {
          setWithdrawWindowOpen(true);
          const updateCountdown = () => {
            const remaining = closeAt.getTime() - Date.now();
            if (remaining <= 0) { setWithdrawWindowOpen(false); setWithdrawCountdown(""); return; }
            const h = Math.floor(remaining / 3600000);
            const m = Math.floor((remaining % 3600000) / 60000);
            const s = Math.floor((remaining % 60000) / 1000);
            setWithdrawCountdown(`${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
          };
          updateCountdown();
          timer = setInterval(updateCountdown, 1000);
        } else {
          setWithdrawWindowOpen(false);
          const nextOpen = new Date(closeAt.getTime() + 48 * 3600000);
          setWithdrawNextOpen(nextOpen.toLocaleString("ar"));
        }
      } else {
        setWithdrawWindowOpen(false);
        if (data.opened_at) {
          const openedAt = new Date(data.opened_at);
          const closeAt = new Date(openedAt.getTime() + (data.window_minutes || 150) * 60000);
          const nextOpen = new Date(closeAt.getTime() + 48 * 3600000);
          setWithdrawNextOpen(nextOpen.toLocaleString("ar"));
        }
      }
    };
    checkWindow();
    return () => { if (timer) clearInterval(timer); };
  }, []);

  // Live ticker — visual only, does NOT save to DB
  // Cron job handles actual DB updates every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const level = storeDataRef.current.store_level || "Small shop";
      const packPrice = PACK_PRICE[level] || 92;
      const totalTopup = Number(storeDataRef.current.total_topup || 0);
      if (totalTopup <= 0) return;

      if (isBlocked) { lastTickRef.current = Date.now(); return; }
      const now = Date.now();
      const elapsed = Math.max(0, (now - lastTickRef.current) / 1000);
      lastTickRef.current = now;
      const perSecond = getProfitPerSecond(storeData.total_topup, level);
      const delta = perSecond * elapsed;

      liveProfitRef.current += delta;
      liveBalanceRef.current += delta;
      setLiveProfit(liveProfitRef.current);
      setLiveBalance(liveBalanceRef.current);
    }, 1000);

    // Refresh from DB every 60 seconds to stay in sync with cron job
    const syncInterval = setInterval(async () => {
      if (!userIdRef.current || isImpersonating) return;
      const { data: store } = await supabase.from("user_stores")
        .select("balance, total_profit").eq("user_id", userIdRef.current).maybeSingle();
      if (store) {
        const dbBalance = Number(store.balance || 0);
        const dbProfit = Number(store.total_profit || 0);
        // Only update if DB value is higher (cron job added profit)
        if (dbBalance > liveBalanceRef.current) {
          liveBalanceRef.current = dbBalance;
          setLiveBalance(dbBalance);
        }
        if (dbProfit > liveProfitRef.current) {
          liveProfitRef.current = dbProfit;
          setLiveProfit(dbProfit);
        }
      }
    }, 60000);

    return () => { clearInterval(interval); clearInterval(syncInterval); };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleWithdrawNav = async () => {
    navigate("/withdraw");
  };

  const referralLink = `${window.location.origin}/login?ref=${referralCode}`;

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    toast.success(isAr ? "تم نسخ رمز الدعوة" : "Referral code copied");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    toast.success(isAr ? "تم نسخ رابط الدعوة" : "Referral link copied");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const storeLevelAr: Record<string, string> = {
    "Small shop": "متجر صغير",
    "Medium shop": "متجر متوسط",
    "Large shop": "متجر كبير",
    "Mega shop": "متجر ميغا",
    VIP: "VIP",
  };

  const packPrice = PACK_PRICE[storeData.store_level] || PACK_PRICE["Small shop"];
  const packActive = storeData.total_topup > 0;
  const dailyRate = getProfitPerSecond(storeData.total_topup, storeData.store_level) * 86400;

  return (
    <div className="min-h-screen bg-background pb-24" dir={dir}>

      {/* Maintenance banner */}
      <div className="bg-orange-500 text-white text-center text-xs py-2 font-bold sticky top-0 z-50">
        ⚙️ الموقع في صيانة مؤقتة — أرصدتك بأمان ✅ سنعود قريباً
      </div>

      {/* Impersonate banner */}
      {isImpersonating && (
        <div className="bg-orange-500 text-white text-center text-xs py-2 font-bold sticky top-0 z-50">
          👁️ وضع المراقبة — حساب: {impersonateId?.slice(0, 8).toUpperCase()} — للقراءة فقط
        </div>
      )}

      <div className="bg-primary text-primary-foreground px-4 py-3 pt-16 flex items-center justify-between shadow-sm">
        <p className="text-sm font-medium flex-1 text-center">
          {isAr ? "مستوى المتجر" : "Position"}:{" "}
          <span className="font-bold">{isAr ? (storeLevelAr[storeData.store_level] || storeData.store_level) : storeData.store_level}</span>
        </p>
        {!isImpersonating && (
          <div className="flex items-center gap-1">
            {/* Bell */}
            <Button variant="ghost" size="icon" className="text-primary-foreground relative" onClick={() => setNotifOpen(!notifOpen)}>
              <Bell className="w-5 h-5" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-primary-foreground">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Notifications Dropdown */}
      {notifOpen && (
        <div className="fixed top-16 left-0 right-0 z-50 max-w-md mx-auto px-4">
          <Card className="shadow-xl border-0">
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <p className="font-bold text-sm">🔔 الإشعارات</p>
                <div className="flex items-center gap-2">
                  {notifications.filter(n => !n.read).length > 0 && (
                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={async () => {
                      await supabase.from("notifications").update({ read: true }).eq("user_id", userIdRef.current).eq("read", false);
                      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                    }}>قراءة الكل</Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setNotifOpen(false)}><X className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y">
                {notifications.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">لا توجد إشعارات</p>
                ) : notifications.map(n => (
                  <div key={n.id} className={`px-4 py-3 ${!n.read ? "bg-blue-50" : ""}`}>
                    <p className="text-sm">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString("ar")}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="max-w-md mx-auto px-4 py-5 space-y-4">
        {isAdmin && !isImpersonating && (
          <Link to="/admin">
            <Card className="shadow-md border-0 bg-destructive/10 cursor-pointer hover:bg-destructive/20 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <Shield className="w-5 h-5 text-destructive" />
                <span className="text-sm font-bold text-destructive">{isAr ? "لوحة تحكم المشرف" : "Go to Admin Dashboard"}</span>
              </CardContent>
            </Card>
          </Link>
        )}

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
              </div>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground">{isAr ? "رصيد المتجر" : "My Store Credit"}</p>
              <p className="text-3xl font-bold text-foreground tabular-nums">{liveBalance.toFixed(2)} USDT</p>
              {packActive && <p className="text-xs text-green-600 mt-1">📈 {isAr ? "الربح مباشر الآن" : "Live profit running"}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Notifications Card */}
        {notifications.filter(n => !n.read).length > 0 && (
          <Card className="shadow-md border-0 border-l-4 border-l-blue-500">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-500" />
                  {isAr ? "إشعارات جديدة" : "New Notifications"}
                  <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {notifications.filter(n => !n.read).length}
                  </span>
                </p>
                <Button size="sm" variant="ghost" className="text-xs h-7 text-blue-600" onClick={async () => {
                  await supabase.from("notifications").update({ read: true }).eq("user_id", userIdRef.current).eq("read", false);
                  setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                }}>
                  {isAr ? "قراءة الكل" : "Mark all read"}
                </Button>
              </div>
              <div className="space-y-3">
                {notifications.filter(n => !n.read).map(n => (
                  <div key={n.id} className={`rounded-xl p-3 text-sm ${
                    n.type === "success" ? "bg-green-50 text-green-800" :
                    n.type === "error" ? "bg-red-50 text-red-800" :
                    "bg-blue-50 text-blue-800"
                  }`}>
                    <p>{n.message}</p>
                    <p className="text-xs opacity-60 mt-1">{new Date(n.created_at).toLocaleString("ar")}</p>
                    {/* رد على الرسالة */}
                    {n.from_admin && !n.reply && (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          placeholder="اكتب ردك..."
                          className="flex-1 text-xs rounded-lg px-2 py-1 border border-current/20 bg-white/50 focus:outline-none"
                          onKeyDown={async (e) => {
                            if (e.key === "Enter" && e.currentTarget.value.trim()) {
                              const replyText = e.currentTarget.value.trim();
                              await supabase.from("notifications").update({
                                reply: replyText,
                                replied_at: new Date().toISOString(),
                                read: true,
                              }).eq("id", n.id);
                              setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, reply: replyText, read: true } : x));
                              toast.success("✅ تم إرسال ردك");
                            }
                          }}
                        />
                        <span className="text-xs opacity-50">↵ إرسال</span>
                      </div>
                    )}
                    {n.reply && (
                      <div className="mt-2 bg-white/50 rounded-lg px-2 py-1 text-xs">
                        ردك: <span className="font-bold">{n.reply}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {referralCode && !isImpersonating && (
          <Card className="shadow-md border-0 bg-primary text-primary-foreground">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm opacity-80">{isAr ? "رمز الدعوة" : "Referral Code"}</span>
                <span className="text-xl font-bold tracking-widest font-mono">{referralCode}</span>
                <Button size="sm" variant="secondary" onClick={copyCode} className="h-8 px-3">
                  {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs opacity-70 truncate flex-1">{referralLink}</span>
                <Button size="sm" variant="secondary" onClick={copyLink} className="h-8 px-3 flex-shrink-0">
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: isAr ? "شحن" : "Recharge", icon: Wallet, color: "text-primary", bg: "bg-primary/10", action: () => navigate("/topup") },
            { label: isAr ? "سحب" : "Withdrawal", icon: ArrowDownToLine, color: "text-profit", bg: "bg-profit/10", action: handleWithdrawNav },
            { label: isAr ? "دردشة" : "Chat", icon: MessageCircle, color: "text-emerald-500", bg: "bg-emerald-500/10", action: () => navigate("/chat") },
            { label: isAr ? "حسابي" : "Account", icon: UserCog, color: "text-purple-500", bg: "bg-purple-500/10", action: null },
          ].map((item) => (
            <div key={item.label} onClick={item.action || undefined} className={item.action ? "cursor-pointer" : ""}>
              <div className="flex flex-col items-center gap-1.5 py-3">
                <div className={`w-12 h-12 rounded-2xl ${item.bg} flex items-center justify-center`}>
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <span className="text-xs font-medium text-foreground text-center leading-tight">{item.label}</span>
              </div>
            </div>
          ))}
        </div>

        <Card className="shadow-md border-0">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-bold text-foreground">{isAr ? "بيانات المتجر" : "Store Data"}</h3>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">{isAr ? "إجمالي الشحن" : "Total Topup"}</span>
              <span className="text-sm font-bold">{storeData.total_topup.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">{isAr ? "إجمالي الأرباح" : "Total Profit"}</span>
              <span className="text-sm font-bold text-green-600 tabular-nums">
                {storeData.total_topup > 0 ? liveProfit.toFixed(2) : "0.00"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">{isAr ? "أرباح الفريق" : "Team Earnings"}</span>
              <span className="text-sm font-bold">{storeData.team_earnings.toFixed(2)}</span>
            </div>

            {storeData.total_topup > 0 && (
              packActive ? (
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-green-700 font-medium">
                    📈 {isAr ? "الربح اليومي المتوقع" : "Expected daily profit"}:{" "}
                    <span className="font-bold">~${dailyRate.toFixed(2)}/day</span>
                  </p>
                  <p className="text-xs text-green-600 mt-1">{isAr ? "الحساب نشط" : "Account active"}</p>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-red-600 font-bold">
                    ⛔ {isAr ? "الباقة موقوفة - الربح متوقف" : "Pack stopped - profit paused"}
                  </p>
                  <Button size="sm" onClick={() => navigate(`/topup?amount=${packPrice}&plan=${encodeURIComponent(storeData.store_level)}`)} className="mt-2 rounded-full px-4">
                    {isAr ? "إعادة التفعيل" : "Reactivate"}
                  </Button>
                </div>
              )
            )}
          </CardContent>
        </Card>

        {/* Blocked banner */}
        {isBlocked && (
          <Card className="shadow-md border-0 bg-red-50 border-red-200">
            <CardContent className="p-4 text-center space-y-2">
              <p className="text-red-700 font-bold text-sm">🔒 حسابك محجوب مؤقتاً</p>
              <p className="text-red-500 text-xs">لا يمكنك السحب أو الربح حتى يتم فك الحجب</p>
              <p className="text-red-400 text-xs">للمزيد من المعلومات تواصل مع الدعم</p>
            </CardContent>
          </Card>
        )}

        {/* Withdrawal window banner */}
        {storeData.total_topup > 0 && (
          withdrawWindowOpen ? (
            <Card className="shadow-md border-0 bg-green-50 border-green-200">
              <CardContent className="p-4 text-center space-y-1">
                <p className="text-green-700 font-bold text-sm">✅ {isAr ? "نافذة السحب مفتوحة الآن" : "Withdrawal window is open"}</p>
                <p className="text-xs text-green-600">{isAr ? "الوقت المتبقي:" : "Time remaining:"}</p>
                <p className="text-3xl font-bold text-green-700 tabular-nums">{withdrawCountdown}</p>
                <Button size="sm" className="mt-2 bg-green-600 hover:bg-green-700 text-white rounded-full px-6"
                  onClick={() => navigate("/withdraw")}>
                  {isAr ? "اسحب الآن" : "Withdraw Now"} →
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-md border-0 bg-red-50 border-red-200">
              <CardContent className="p-4 text-center space-y-1">
                <p className="text-red-700 font-bold text-sm">🔒 {isAr ? "نافذة السحب مغلقة" : "Withdrawal window closed"}</p>
                {withdrawNextOpen && (
                  <p className="text-xs text-red-500">
                    {isAr ? "الفتح القادم المتوقع:" : "Next opening:"} <span className="font-bold">{withdrawNextOpen}</span>
                  </p>
                )}
                <p className="text-xs text-red-400">{isAr ? "تُفتح كل 48 ساعة لمدة ساعتين ونصف" : "Opens every 48h for 2.5 hours"}</p>
              </CardContent>
            </Card>
          )
        )}

        <Card className="shadow-md border-0">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input type="date" value={searchDate} onChange={(e) => setSearchDate(e.target.value)} className="flex-1" />
              <Button size="sm" className="bg-primary text-primary-foreground px-4">
                <Search className="w-4 h-4" />
                <span className="mx-1">{isAr ? "بحث" : "Search"}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {[
            { label: isAr ? "الموقع الرسمي" : "Official Website", icon: Globe },
            { label: isAr ? "قرض" : "Loan", icon: Landmark },
            { label: isAr ? "تحميل" : "Download", icon: Download },
          ].map((link) => (
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