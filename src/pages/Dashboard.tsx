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

const PROFIT_PER_SECOND: Record<string, number> = {
  "Small shop": 9.5 / 86400,
  "Medium shop": 32 / 86400,
  "Large shop": 75 / 86400,
  "Mega shop": 110 / 86400,
  VIP: 180 / 86400,
};

const DAILY_PROFIT_BY_TOPUP = (totalTopup: number): number => {
  if (totalTopup >= 2200) return 78;
  if (totalTopup >= 1650) return 55;
  if (totalTopup >= 1100) return 36;
  if (totalTopup >= 750)  return 24;
  if (totalTopup >= 350)  return 11;
  if (totalTopup >= 99)   return 2.8;
  if (totalTopup >= 45)   return 1.2;
  // old pack prices
  if (totalTopup >= 700)  return 24;
  if (totalTopup >= 320)  return 11;
  if (totalTopup >= 92)   return 2.8;
  return 4.4614;
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
  today_profit: number;
};

const INITIAL_STORE: StoreData = {
  store_level: "Small shop",
  balance: 0,
  total_topup: 0,
  total_profit: 0,
  team_earnings: 0,
  today_profit: 0,
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
  const [availableBalance, setAvailableBalance] = useState(0);
  const [todayProfit, setTodayProfit] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [popupNotif, setPopupNotif] = useState<any | null>(null);

  const [withdrawWindowOpen, setWithdrawWindowOpen] = useState(false);
  const [withdrawCountdown, setWithdrawCountdown] = useState("");
  const [withdrawNextOpen, setWithdrawNextOpen] = useState("");
  const storeDataRef = useRef<StoreData>(INITIAL_STORE);
  const liveProfitRef = useRef(0);
  const liveBalanceRef = useRef(0);
  const userIdRef = useRef("");
  const lastTickRef = useRef(Date.now());
  const todayProfitRef = useRef(0);
  const lastTickTodayRef = useRef(Date.now());

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
            today_profit: Number(store.today_profit || 0),
          });
          const impTodayProfit = Number(store.today_profit || 0);
          const impDailyProfit = DAILY_PROFIT_BY_TOPUP(Number(store.total_topup || 0));
          const nowImp = new Date();
          const midnightImp = new Date(); midnightImp.setHours(0, 0, 0, 0);
          const impElapsed = Math.min((impDailyProfit / 86400) * ((nowImp.getTime() - midnightImp.getTime()) / 1000), impDailyProfit);
          const finalTodayProfit = Math.max(impTodayProfit, impElapsed);
          setTodayProfit(finalTodayProfit);
          todayProfitRef.current = finalTodayProfit;
          lastTickTodayRef.current = Date.now();
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

      // Jib total withdrawn confirmed
      const { data: withdrawData } = await supabase
        .from("withdrawals")
        .select("amount")
        .eq("user_id", user.id)
        .eq("status", "confirmed");
      const totalWithdrawn = (withdrawData || []).reduce((sum: number, w: any) => sum + Number(w.amount || 0), 0);
      const availableBalance = Math.max(0, dbProfit - totalWithdrawn);

      // Just read from DB — cron job handles profit calculation
      setStoreData({
        store_level: store.store_level || "Small shop",
        balance: dbBalance,
        total_topup: Number(store.total_topup || 0),
        total_profit: dbProfit,
        team_earnings: Number(store.team_earnings || 0),
        today_profit: Number(store.today_profit || 0),
      });
      const dbTodayProfit = Number(store.today_profit || 0);
      const dailyProfit = DAILY_PROFIT_BY_TOPUP(Number(store.total_topup || 0));
      
      // 7seb shhal tzad mn 00:00 l daba
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      const secondsSinceMidnight = (now.getTime() - midnight.getTime()) / 1000;
      const elapsedProfit = Math.min((dailyProfit / 86400) * secondsSinceMidnight, dailyProfit);
      
      // Khud l-akbar: DB wla l-7isab
      const initTodayProfit = Math.max(dbTodayProfit, elapsedProfit);
      setTodayProfit(initTodayProfit);
      todayProfitRef.current = initTodayProfit;
      lastTickTodayRef.current = Date.now();
      setLiveBalance(availableBalance);
      setAvailableBalance(availableBalance);
      setLiveProfit(dbProfit);
      liveProfitRef.current = dbProfit;
      liveBalanceRef.current = availableBalance;
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
          setPopupNotif(n);
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

  // Refresh from DB every 5 minutes
  useEffect(() => {
    if (!userIdRef.current) return;

    const interval = setInterval(async () => {
      if (!userIdRef.current) return;
      const { data: store } = await supabase
        .from("user_stores")
        .select("total_profit, today_profit, total_topup")
        .eq("user_id", userIdRef.current)
        .maybeSingle();

      const { data: withdrawData } = await supabase
        .from("withdrawals")
        .select("amount")
        .eq("user_id", userIdRef.current)
        .eq("status", "confirmed");

      if (store) {
        const dbProfit = Number(store.total_profit || 0);
        const totalWithdrawn = (withdrawData || []).reduce((sum: number, w: any) => sum + Number(w.amount || 0), 0);
        const availableBalance = Math.max(0, dbProfit - totalWithdrawn);
        setLiveProfit(dbProfit);
        setLiveBalance(availableBalance);
        setAvailableBalance(availableBalance);
        liveProfitRef.current = dbProfit;
        liveBalanceRef.current = availableBalance;
      }
    }, 5 * 60 * 1000);

    return () => { clearInterval(interval); };
  }, []);

  // Today profit ticker — kaytzad chwiya b chwiya 7ta ywsel l-daily profit
  useEffect(() => {
    let lastDay = new Date().getDate();

    const ticker = setInterval(() => {
      const totalTopup = storeDataRef.current.total_topup || 0;
      if (totalTopup <= 0 || isBlocked) return;

      // Reset f 00:00 (nhar jdid)
      const today = new Date().getDate();
      if (today !== lastDay) {
        lastDay = today;
        todayProfitRef.current = 0;
        lastTickTodayRef.current = Date.now();
        setTodayProfit(0);
        return;
      }

      const dailyProfit = DAILY_PROFIT_BY_TOPUP(totalTopup);
      const perSecond = dailyProfit / 86400;

      const nowMs = Date.now();
      const elapsed = Math.max(0, (nowMs - lastTickTodayRef.current) / 1000);
      lastTickTodayRef.current = nowMs;

      const delta = perSecond * elapsed;
      todayProfitRef.current = Math.min(todayProfitRef.current + delta, dailyProfit);
      setTodayProfit(todayProfitRef.current);
    }, 1000);

    return () => { clearInterval(ticker); };
  }, [isBlocked]);

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
  const dailyRate = DAILY_PROFIT_BY_TOPUP(storeData.total_topup);

  return (
    <div className="min-h-screen bg-background pb-24" dir={dir}>

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
              <p className="text-xs text-muted-foreground">{isAr ? "إجمالي ربح اليوم" : "Total Profit Today"}</p>
              <p className="text-3xl font-bold text-green-600 tabular-nums">{todayProfit.toFixed(4)} USDT</p>
              {packActive && <p className="text-xs text-green-600 mt-1">📈 {isAr ? "الربح مباشر الآن" : "Live profit running"}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Notifications Card — ma kaybanch msg dyal chat */}
        {notifications.filter(n => !n.read && !n.message?.includes("لديك رسالة جديدة من الوكيل")).length > 0 && (
          <Card className="shadow-md border-0 border-l-4 border-l-blue-500">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-500" />
                  {isAr ? "إشعارات جديدة" : "New Notifications"}
                  <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {notifications.filter(n => !n.read && !n.message?.includes("لديك رسالة جديدة من الوكيل")).length}
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
                {notifications.filter(n => !n.read && !n.message?.includes("لديك رسالة جديدة من الوكيل")).map(n => (
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
            { label: isAr ? "تحميل التطبيق" : "Download App", icon: Download },
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

      {/* Popup Notification */}
      {popupNotif && (
        <div className="fixed top-20 left-0 right-0 z-50 flex justify-center px-4 animate-in slide-in-from-top-2 duration-300">
          <div className={`w-full max-w-sm rounded-2xl shadow-xl p-4 flex items-start gap-3 ${
            popupNotif.type === "success" ? "bg-green-500" :
            popupNotif.type === "error" ? "bg-red-500" :
            "bg-primary"
          } text-white`}>
            <div className="flex-1">
              <p className="text-sm font-bold">{popupNotif.message}</p>
              <p className="text-xs opacity-70 mt-0.5">
                {new Date(popupNotif.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <button
              onClick={() => setPopupNotif(null)}
              className="text-white/70 hover:text-white text-lg leading-none flex-shrink-0"
            >✕</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;