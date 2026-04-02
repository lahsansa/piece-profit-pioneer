import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, CheckCircle, XCircle, Lock, Plus, Minus, Edit, Users, Trash2, ZoomIn, Eye, LogIn, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { toast } from "sonner";

// Admin emails allowed to access panel
const ADMIN_EMAILS = [
  "hassan@admin.com",
  "admin2@vertex.com",
];
const STORE_LEVELS = ["Small shop", "Medium shop", "Large shop", "Mega shop", "VIP"];
const REFERRAL_COMMISSION = 5;

// ===================== TYPES =====================
interface UserRow {
  user_id: string;
  email: string;
  plain_password: string;
  store_level: string;
  balance: number;
  total_topup: number;
  total_profit: number;
  team_earnings: number;
  referral_code: string;
  referred_by: string;
  referral_count: number;
  paid_referrals: number;
  created_at: string;
  last_profit_update: string;
}

// ===================== COMPONENT =====================
const Admin = () => {
  // --- Auth ---
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);

  // --- Data ---
  const [users, setUsers] = useState<UserRow[]>([]);
  const [topups, setTopups] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [upgrades, setUpgrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("topups");

  // --- Topup approve ---
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedTopup, setSelectedTopup] = useState<any>(null);
  const [editedAmount, setEditedAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const approvingRef = useRef(new Set<string>());

  // --- Balance dialog ---
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceReason, setBalanceReason] = useState("");
  const [balanceAction, setBalanceAction] = useState<"add" | "subtract">("add");

  // --- Level dialog ---
  const [levelDialogOpen, setLevelDialogOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState("");

  // --- Manual topup ---
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualTxid, setManualTxid] = useState("");

  // --- User detail modal ---
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<UserRow | null>(null);
  const [detailTopups, setDetailTopups] = useState<any[]>([]);
  const [detailWithdrawals, setDetailWithdrawals] = useState<any[]>([]);
  const [detailTeam, setDetailTeam] = useState<UserRow[]>([]);

  // --- Image zoom ---
  const [imgDialogOpen, setImgDialogOpen] = useState(false);
  const [imgUrl, setImgUrl] = useState("");

  // --- Withdraw screenshot upload ---
  const [uploadingWithdrawId, setUploadingWithdrawId] = useState("");

  // --- Withdrawal window ---
  const [withdrawWindow, setWithdrawWindow] = useState<any>(null);
  const [windowCountdown, setWindowCountdown] = useState("");

  // --- User withdrawals modal ---
  const [userWithdrawsOpen, setUserWithdrawsOpen] = useState(false);
  const [userWithdraws, setUserWithdraws] = useState<any[]>([]);
  const [userWithdrawsName, setUserWithdrawsName] = useState("");

  // --- Delete ---
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null);

  // --- Withdraw detail modal ---
  const [withdrawDetailOpen, setWithdrawDetailOpen] = useState(false);
  const [selectedWithdraw, setSelectedWithdraw] = useState<any>(null);

  // ===================== LOAD =====================
  useEffect(() => { if (adminAuth) loadAll(); }, [adminAuth]);

  const handleAdminLogin = async () => {
    setAdminLoginLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: adminUser,
        password: adminPass,
      });
      if (error) throw error;
      if (!ADMIN_EMAILS.includes(data.user?.email || "")) {
        await supabase.auth.signOut();
        toast.error("❌ ليس لديك صلاحية الوصول لهذا البانل");
        return;
      }
      setAdminAuth(true);
    } catch (err: any) {
      toast.error(err.message || "Email أو Password غلط ❌");
    } finally {
      setAdminLoginLoading(false);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadUsers(), loadTopups(), loadWithdrawals(), loadUpgrades(), loadWithdrawWindow()]);
    setLoading(false);
  };

  const loadUsers = async () => {
    const { data } = await supabase.from("users_with_email").select("*");
    if (!data) return;
    const mapped = data.map((u: any) => {
      const myCode = u.referral_code;
      const referrals = data.filter((r: any) => r.referred_by === myCode);
      return {
        user_id: u.user_id,
        email: u.email || "",
        plain_password: u.plain_password || "",
        store_level: u.store_level,
        balance: Number(u.balance),
        total_topup: Number(u.total_topup),
        total_profit: Number(u.total_profit),
        team_earnings: Number(u.team_earnings || 0),
        referral_code: u.referral_code || "",
        referred_by: u.referred_by || "",
        referral_count: referrals.length,
        paid_referrals: referrals.filter((r: any) => Number(r.total_topup) > 0).length,
        created_at: u.created_at,
        last_profit_update: u.last_profit_update,
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setUsers(mapped);
  };

  const loadTopups = async () => {
    const { data } = await supabase.from("topups").select("*").order("created_at", { ascending: false });
    if (data) setTopups(data);
  };

  const loadWithdrawals = async () => {
    const { data } = await supabase.from("withdrawals").select("*").order("created_at", { ascending: false });
    if (data) setWithdrawals(data);
  };

  const loadUpgrades = async () => {
    const { data } = await supabase.from("topups").select("*").eq("status", "confirmed").not("upgrade_to", "is", null).order("created_at", { ascending: false });
    if (data) setUpgrades(data);
  };

  // ===================== USER DETAIL =====================
  const openDetail = async (user: UserRow) => {
    setDetailUser(user);
    setDetailOpen(true);
    const [{ data: t }, { data: w }] = await Promise.all([
      supabase.from("topups").select("*").eq("user_id", user.user_id).order("created_at", { ascending: false }).limit(10),
      supabase.from("withdrawals").select("*").eq("user_id", user.user_id).order("created_at", { ascending: false }).limit(10),
    ]);
    setDetailTopups(t || []);
    setDetailWithdrawals(w || []);
    setDetailTeam(users.filter(u => u.referred_by === user.referral_code));
  };

  // ===================== IMPERSONATE =====================
  // Opens dashboard in a new tab with user_id in URL (read-only, no session change)
  const handleImpersonate = (user: UserRow) => {
    const url = `/dashboard?impersonate=${user.user_id}`;
    window.open(url, "_blank");
    toast.success(`👁️ فتح dashboard ديال ${user.email || user.user_id.slice(0,8).toUpperCase()}`);
  };

  // ===================== TOPUP APPROVE =====================
  const openApproveDialog = (topup: any) => {
    setSelectedTopup(topup);
    setEditedAmount(String(topup.amount_usdt));
    setApproveDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedTopup) return;
    const amount = Number(editedAmount);
    if (!amount || amount <= 0) { toast.error("أدخل مبلغ صحيح"); return; }
    if (approvingRef.current.has(selectedTopup.id)) return;
    approvingRef.current.add(selectedTopup.id);
    setSubmitting(true);
    try {
      const { error } = await supabase.from("topups").update({ status: "confirmed", amount_usdt: amount }).eq("id", selectedTopup.id).eq("status", "pending");
      if (error) throw error;

      const { data: store } = await supabase.from("user_stores").select("balance, total_topup, referred_by").eq("user_id", selectedTopup.user_id).single();
      if (store) {
        const bonus = Math.round(amount * 0.05 * 100) / 100;
        const updateData: any = {
          balance: Number(store.balance) + amount + bonus,
          total_topup: Number(store.total_topup) + amount,
        };
        if (selectedTopup.upgrade_to) updateData.store_level = selectedTopup.upgrade_to;
        await supabase.from("user_stores").update(updateData).eq("user_id", selectedTopup.user_id);

        if (store.referred_by) {
          const { data: ref } = await supabase.from("user_stores").select("balance, team_earnings").eq("referral_code", store.referred_by).single();
          if (ref) await supabase.from("user_stores").update({ balance: Number(ref.balance) + REFERRAL_COMMISSION, team_earnings: Number(ref.team_earnings || 0) + REFERRAL_COMMISSION }).eq("referral_code", store.referred_by);
        }
        toast.success(`✅ تمت الموافقة — ${amount} USDT + ${bonus} bonus${selectedTopup.upgrade_to ? ` + ترقية لـ ${selectedTopup.upgrade_to}` : ""}`);
      }
      setApproveDialogOpen(false);
      await loadAll();
    } catch (err: any) { toast.error(err.message || "حدث خطأ"); }
    finally { approvingRef.current.delete(selectedTopup.id); setSubmitting(false); }
  };

  const handleReject = async (id: string) => {
    await supabase.from("topups").update({ status: "rejected" }).eq("id", id);
    toast.success("تم رفض الطلب");
    await loadTopups();
  };

  // ===================== WITHDRAWALS =====================
  const handleApproveWithdraw = async (w: any) => {
    await supabase.from("withdrawals").update({ status: "confirmed" }).eq("id", w.id);
    toast.success(`✅ تم تأكيد سحب ${w.amount} USDT`);
    await loadWithdrawals();
  };

  const handleRejectWithdraw = async (w: any) => {
    const { data: store } = await supabase.from("user_stores").select("balance").eq("user_id", w.user_id).single();
    if (store) await supabase.from("user_stores").update({ balance: Number(store.balance) + Number(w.amount) }).eq("user_id", w.user_id);
    await supabase.from("withdrawals").update({ status: "rejected" }).eq("id", w.id);
    toast.success("تم رفض السحب وإرجاع الرصيد");
    await loadAll();
  };

  // ===================== BALANCE =====================
  const openBalanceDialog = (user: UserRow, action: "add" | "subtract") => {
    setSelectedUser(user);
    setBalanceAction(action);
    setBalanceAmount("");
    setBalanceReason("");
    setBalanceDialogOpen(true);
  };

  const handleBalanceUpdate = async () => {
    if (!selectedUser || !balanceAmount || Number(balanceAmount) <= 0) { toast.error("أدخل مبلغ صحيح"); return; }
    const amount = Number(balanceAmount);
    const newBalance = balanceAction === "add" ? selectedUser.balance + amount : Math.max(0, selectedUser.balance - amount);
    await supabase.from("user_stores").update({ balance: newBalance }).eq("user_id", selectedUser.user_id);
    toast.success(balanceAction === "add" ? `✅ تمت إضافة ${amount} $ ${balanceReason ? `— ${balanceReason}` : ""}` : `✅ تم خصم ${amount} $ ${balanceReason ? `— ${balanceReason}` : ""}`);
    setBalanceDialogOpen(false);
    await loadUsers();
  };

  // ===================== LEVEL =====================
  const openLevelDialog = (user: UserRow) => { setSelectedUser(user); setSelectedLevel(user.store_level); setLevelDialogOpen(true); };
  const handleLevelUpdate = async () => {
    if (!selectedUser) return;
    await supabase.from("user_stores").update({ store_level: selectedLevel }).eq("user_id", selectedUser.user_id);
    toast.success("✅ تم تحديث المستوى");
    setLevelDialogOpen(false);
    await loadUsers();
  };

  // ===================== MANUAL TOPUP =====================
  const handleManualTopup = async () => {
    if (!manualTxid.trim() || !manualAmount || Number(manualAmount) <= 0) { toast.error("أدخل المعرف والمبلغ"); return; }
    setSubmitting(true);
    try {
      await supabase.from("topups").insert({ user_id: selectedUserId, txid: manualTxid.trim(), amount_usdt: Number(manualAmount), status: "confirmed" });
      const { data: store } = await supabase.from("user_stores").select("balance, total_topup, referred_by").eq("user_id", selectedUserId).single();
      if (store) {
        await supabase.from("user_stores").update({ balance: Number(store.balance) + Number(manualAmount), total_topup: Number(store.total_topup) + Number(manualAmount) }).eq("user_id", selectedUserId);
        if (store.referred_by) {
          const { data: ref } = await supabase.from("user_stores").select("balance, team_earnings").eq("referral_code", store.referred_by).single();
          if (ref) await supabase.from("user_stores").update({ balance: Number(ref.balance) + REFERRAL_COMMISSION, team_earnings: Number(ref.team_earnings || 0) + REFERRAL_COMMISSION }).eq("referral_code", store.referred_by);
        }
      }
      toast.success("✅ تم الشحن اليدوي");
      setManualDialogOpen(false);
      await loadAll();
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  // ===================== WITHDRAWAL WINDOW =====================
  const loadWithdrawWindow = async () => {
    const { data } = await supabase.from("withdrawal_settings").select("*").eq("id", 1).single();
    if (data) setWithdrawWindow(data);
  };

  const handleOpenWindow = async () => {
    await supabase.from("withdrawal_settings").update({
      is_open: true,
      opened_at: new Date().toISOString(),
    }).eq("id", 1);
    toast.success("✅ تم فتح نافذة السحب لمدة 2.5 ساعة!");
    await loadWithdrawWindow();
  };

  const handleCloseWindow = async () => {
    await supabase.from("withdrawal_settings").update({ is_open: false }).eq("id", 1);
    toast.success("🔒 تم إغلاق نافذة السحب");
    await loadWithdrawWindow();
  };

  // ===================== WITHDRAW SCREENSHOT UPLOAD =====================
  const handleWithdrawScreenshot = async (withdrawId: string, file: File) => {
    setUploadingWithdrawId(withdrawId);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `withdraw_admin_${withdrawId}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("topup-screenshots")
        .upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("topup-screenshots").getPublicUrl(fileName);
      await supabase.from("withdrawals").update({ screenshot_url: urlData.publicUrl }).eq("id", withdrawId);
      toast.success("✅ تم رفع صورة الإثبات");
      await loadWithdrawals();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ في الرفع");
    } finally {
      setUploadingWithdrawId("");
    }
  };

  // ===================== DELETE =====================
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    await supabase.from("user_stores").delete().eq("user_id", userToDelete.user_id);
    await supabase.from("topups").delete().eq("user_id", userToDelete.user_id);
    await supabase.from("withdrawals").delete().eq("user_id", userToDelete.user_id);
    toast.success("✅ تم حذف المستخدم");
    setDeleteDialogOpen(false);
    await loadAll();
  };

  // ===================== LOGIN SCREEN =====================
  if (!adminAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
        <Card className="w-full max-w-sm shadow-2xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-3">
              <Shield className="w-7 h-7 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Admin Panel</CardTitle>
            <p className="text-sm text-muted-foreground">منصة الإدارة الآمنة</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="admin@email.com" value={adminUser} onChange={e => setAdminUser(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdminLogin()} />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" placeholder="••••••••" value={adminPass} onChange={e => setAdminPass(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdminLogin()} />
            </div>
            <Button className="w-full h-11 font-bold text-base" onClick={handleAdminLogin} disabled={adminLoginLoading}>
              <Lock className="w-4 h-4 mr-2" /> {adminLoginLoading ? "جاري الدخول..." : "دخول"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingTopups = topups.filter(t => t.status === "pending");
  const otherTopups = topups.filter(t => t.status !== "pending");
  const pendingWithdrawals = withdrawals.filter(w => w.status === "pending");
  const otherWithdrawals = withdrawals.filter(w => w.status !== "pending");
  const totalBalance = users.reduce((s, u) => s + u.balance, 0);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-center space-y-2"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"/><p className="text-muted-foreground">جاري التحميل...</p></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* ===== HEADER ===== */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none">لوحة الإدارة</h1>
              <p className="text-xs text-muted-foreground">مرحباً {adminUser}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-xs text-muted-foreground">إجمالي الأرصدة</p>
              <p className="font-bold text-green-600">{totalBalance.toFixed(2)} $</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setAdminAuth(false)}>خروج</Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ===== STATS ROW ===== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "المستخدمون", value: users.length, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "طلبات الشحن", value: pendingTopups.length, color: "text-orange-600", bg: "bg-orange-50" },
            { label: "طلبات السحب", value: pendingWithdrawals.length, color: "text-red-600", bg: "bg-red-50" },
            { label: "إجمالي الأرصدة", value: `${totalBalance.toFixed(0)}$`, color: "text-green-600", bg: "bg-green-50" },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ===== WITHDRAWAL WINDOW CONTROL ===== */}
        {withdrawWindow && (
          <div className={`rounded-2xl p-4 flex items-center justify-between ${withdrawWindow.is_open ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
            <div>
              <p className={`font-bold text-sm ${withdrawWindow.is_open ? "text-green-700" : "text-red-700"}`}>
                {withdrawWindow.is_open ? "✅ نافذة السحب مفتوحة" : "🔒 نافذة السحب مغلقة"}
              </p>
              {withdrawWindow.is_open && withdrawWindow.opened_at && (
                <p className="text-xs text-green-600 mt-0.5">
                  فُتحت: {new Date(withdrawWindow.opened_at).toLocaleString("ar")} · تُغلق بعد {withdrawWindow.window_minutes} دقيقة
                </p>
              )}
            </div>
            {withdrawWindow.is_open ? (
              <Button variant="destructive" size="sm" onClick={handleCloseWindow}>🔒 إغلاق الآن</Button>
            ) : (
              <Button className="bg-green-600 hover:bg-green-700 text-white" size="sm" onClick={handleOpenWindow}>✅ فتح نافذة السحب</Button>
            )}
          </div>
        )}

        {/* ===== TABS ===== */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "topups", label: "طلبات الشحن", count: pendingTopups.length, color: "bg-red-500" },
            { key: "withdrawals", label: "طلبات السحب", count: pendingWithdrawals.length, color: "bg-orange-500" },
            { key: "users", label: `المستخدمون (${users.length})`, count: 0, color: "" },
            { key: "upgrades", label: "الترقيات", count: upgrades.length, color: "bg-purple-500" },
          ].map(tab => (
            <Button key={tab.key} variant={activeTab === tab.key ? "default" : "outline"} onClick={() => setActiveTab(tab.key)} className="relative">
              {tab.label}
              {tab.count > 0 && <Badge className={`mr-2 ${tab.color} text-white`}>{tab.count}</Badge>}
            </Button>
          ))}
        </div>

        {/* ===== TOPUPS TAB ===== */}
        {activeTab === "topups" && (
          <div className="space-y-4">
            {pendingTopups.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-orange-600">⏳ في الانتظار ({pendingTopups.length})</h2>
                {pendingTopups.map(t => (
                  <Card key={t.id} className="border-orange-200 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="md:w-1/4 cursor-pointer group" onClick={() => { setImgUrl(t.screenshot_url); setImgDialogOpen(true); }}>
                          {t.screenshot_url ? (
                            <div className="relative">
                              <img src={t.screenshot_url} className="w-full h-36 object-cover rounded-xl border group-hover:opacity-80 transition-opacity" />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-xl">
                                <ZoomIn className="w-8 h-8 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-36 bg-muted rounded-xl flex items-center justify-center text-xs text-muted-foreground">لا يوجد إثبات</div>
                          )}
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <div><span className="text-muted-foreground">المبلغ: </span><span className="font-bold text-green-600 text-lg">{t.amount_usdt} USDT</span></div>
                            <div><span className="text-muted-foreground">Account: </span><span className="font-mono font-bold">{t.user_id.slice(0,8).toUpperCase()}</span></div>
                            <div><span className="text-muted-foreground">التاريخ: </span><span>{new Date(t.created_at).toLocaleDateString("en-GB")}</span></div>
                            {t.upgrade_to && <div><span className="text-muted-foreground">ترقية إلى: </span><Badge className="bg-purple-500">⬆️ {t.upgrade_to}</Badge></div>}
                          </div>
                          {t.upgrade_to && <div className="bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 text-xs text-purple-700 font-bold">⬆️ طلب ترقية — سيتم تغيير الباقة عند القبول</div>}
                          <div className="flex gap-2">
                            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white h-10 font-bold" onClick={() => openApproveDialog(t)}><CheckCircle className="w-4 h-4 mr-1" /> قبول</Button>
                            <Button className="flex-1 h-10 font-bold" variant="destructive" onClick={() => handleReject(t.id)}><XCircle className="w-4 h-4 mr-1" /> رفض</Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {pendingTopups.length === 0 && <Card className="border-dashed"><CardContent className="p-10 text-center text-muted-foreground">✅ لا توجد طلبات شحن في الانتظار</CardContent></Card>}
            {otherTopups.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">سجل الشحنات ({otherTopups.length})</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Account</TableHead><TableHead>المبلغ</TableHead><TableHead>نوع</TableHead><TableHead>الحالة</TableHead><TableHead>التاريخ</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {otherTopups.slice(0, 50).map(t => (
                        <TableRow key={t.id}>
                          <TableCell className="font-mono text-xs font-bold">{t.user_id.slice(0,8).toUpperCase()}</TableCell>
                          <TableCell className="font-bold">{t.amount_usdt} USDT</TableCell>
                          <TableCell>{t.upgrade_to ? <Badge className="bg-purple-500 text-xs">⬆️ ترقية</Badge> : <Badge variant="outline" className="text-xs">شحن</Badge>}</TableCell>
                          <TableCell><Badge variant={t.status === "confirmed" ? "default" : "destructive"} className="text-xs">{t.status === "confirmed" ? "✅" : "❌"}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("en-GB")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ===== WITHDRAWALS TAB ===== */}
        {activeTab === "withdrawals" && (
          <div className="space-y-4">

            {/* --- PENDING --- */}
            {pendingWithdrawals.length > 0 ? (
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-orange-600 px-1">⏳ في الانتظار ({pendingWithdrawals.length})</h2>
                <Card className="shadow-sm overflow-hidden">
                  <div className="divide-y divide-border">
                    {pendingWithdrawals.map(w => {
                      const prevConfirmed = withdrawals.filter(x => x.user_id === w.user_id && x.id !== w.id);
                      const hasDuplicates = pendingWithdrawals.filter(x => x.user_id === w.user_id).length > 1;
                      return (
                        <div
                          key={w.id}
                          className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${hasDuplicates ? "bg-red-50" : ""}`}
                          onClick={() => { setSelectedWithdraw({ ...w, prevConfirmed }); setWithdrawDetailOpen(true); }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-orange-600">{w.user_id.slice(0,2).toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="text-sm font-bold font-mono">{w.user_id.slice(0,8).toUpperCase()}</p>
                              <p className="text-xs text-muted-foreground">{w.method} · {new Date(w.created_at).toLocaleDateString("en-GB")}</p>
                            </div>
                            {hasDuplicates && (
                              <Badge className="bg-red-500 text-white text-xs">طلبات متعددة</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-red-500 text-base">{w.amount} USDT</span>
                            <Badge className="bg-orange-100 text-orange-700 text-xs border-0">⏳ انتظار</Badge>
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            ) : (
              <Card className="border-dashed"><CardContent className="p-10 text-center text-muted-foreground">✅ لا توجد طلبات سحب في الانتظار</CardContent></Card>
            )}

            {/* --- HISTORY --- */}
            {otherWithdrawals.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-muted-foreground px-1">سجل السحبات ({otherWithdrawals.length})</h2>
                <Card className="shadow-sm overflow-hidden">
                  <div className="divide-y divide-border">
                    {otherWithdrawals.slice(0, 50).map(w => {
                      const prevConfirmed = withdrawals.filter(x => x.user_id === w.user_id && x.id !== w.id);
                      return (
                        <div
                          key={w.id}
                          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                          onClick={() => { setSelectedWithdraw({ ...w, prevConfirmed }); setWithdrawDetailOpen(true); }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-slate-500">{w.user_id.slice(0,2).toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="text-sm font-bold font-mono">{w.user_id.slice(0,8).toUpperCase()}</p>
                              <p className="text-xs text-muted-foreground">{w.method} · {new Date(w.created_at).toLocaleDateString("en-GB")}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-red-500">{w.amount} USDT</span>
                            {w.status === "confirmed" && <Badge className="bg-green-100 text-green-700 border-0 text-xs">✅ مقبول</Badge>}
                            {w.status === "rejected" && <Badge className="bg-red-100 text-red-700 border-0 text-xs">❌ مرفوض</Badge>}
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ===== USERS TAB ===== */}
        {activeTab === "users" && (
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>المستخدمون ({users.length})</CardTitle>
                <div className="text-sm text-green-600 font-bold">💰 إجمالي: {totalBalance.toFixed(2)} $</div>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="pl-4">Account</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>المستوى</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الرصيد</TableHead>
                    <TableHead>الإجمالي</TableHead>
                    <TableHead>التسجيل</TableHead>
                    <TableHead>فريق</TableHead>
                    <TableHead className="pr-4">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.user_id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => openDetail(u)}>
                      <TableCell className="font-mono text-xs font-bold pl-4">{u.user_id.slice(0,8).toUpperCase()}</TableCell>
                      <TableCell className="text-xs text-blue-600 max-w-[140px] truncate">{u.email || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="text-xs whitespace-nowrap">{u.store_level}</span>
                          <Button size="sm" variant="ghost" className="h-5 w-5 p-0 opacity-50 hover:opacity-100" onClick={() => openLevelDialog(u)}><Edit className="w-3 h-3" /></Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${u.total_topup > 0 ? "bg-green-500" : "bg-gray-300 text-gray-600"}`}>
                          {u.total_topup > 0 ? "🟢 Active" : "⚪ Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-green-600">{u.balance.toFixed(2)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.total_topup.toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{u.created_at ? new Date(u.created_at).toLocaleDateString("en-GB") : "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => openDetail(u)}>
                          <Users className="w-3 h-3 mr-1" />{u.referral_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-4" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          {/* View Details */}
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0" title="عرض التفاصيل" onClick={() => openDetail(u)}><Eye className="w-3 h-3" /></Button>
                          {/* Add Balance */}
                          <Button size="sm" className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700 text-white" title="إضافة رصيد" onClick={() => openBalanceDialog(u, "add")}><ArrowUpCircle className="w-3 h-3" /></Button>
                          {/* Subtract Balance */}
                          <Button size="sm" variant="destructive" className="h-7 w-7 p-0" title="خصم رصيد" onClick={() => openBalanceDialog(u, "subtract")}><ArrowDownCircle className="w-3 h-3" /></Button>
                          {/* Impersonate */}
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-blue-600 border-blue-200 hover:bg-blue-50" title="دخول كـ هذا المستخدم" onClick={() => handleImpersonate(u)}><LogIn className="w-3 h-3" /></Button>
                          {/* Delete */}
                          <Button size="sm" variant="destructive" className="h-7 w-7 p-0 opacity-60 hover:opacity-100" title="حذف" onClick={() => { setUserToDelete(u); setDeleteDialogOpen(true); }}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ===== UPGRADES TAB ===== */}
        {activeTab === "upgrades" && (
          <Card>
            <CardHeader><CardTitle>سجل الترقيات ({upgrades.length})</CardTitle></CardHeader>
            <CardContent>
              {upgrades.length === 0 ? <p className="text-center text-muted-foreground py-8">لا توجد ترقيات بعد</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Account</TableHead><TableHead>إلى</TableHead><TableHead>المبلغ</TableHead><TableHead>التاريخ</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {upgrades.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="font-mono text-xs font-bold">{u.user_id.slice(0,8).toUpperCase()}</TableCell>
                        <TableCell><Badge className="bg-purple-500">⬆️ {u.upgrade_to}</Badge></TableCell>
                        <TableCell className="font-bold text-green-500">{u.amount_usdt} USDT</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString("en-GB")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ===== USER DETAIL MODAL ===== */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              تفاصيل المستخدم — {detailUser?.user_id.slice(0,8).toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          {detailUser && (
            <Tabs defaultValue="overview" dir="rtl">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
                <TabsTrigger value="topups">الشحنات</TabsTrigger>
                <TabsTrigger value="withdrawals">السحوبات</TabsTrigger>
                <TabsTrigger value="team">الفريق</TabsTrigger>
              </TabsList>

              {/* Overview */}
              <TabsContent value="overview" className="space-y-3 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Email", value: detailUser.email },
                    { label: "Account ID", value: detailUser.user_id.slice(0,8).toUpperCase() },
                    { label: "المستوى", value: detailUser.store_level },
                    { label: "جاء من", value: detailUser.referred_by || "—" },
                    { label: "تاريخ التسجيل", value: new Date(detailUser.created_at).toLocaleDateString("en-GB") },
                    { label: "الحالة", value: detailUser.total_topup > 0 ? "🟢 Active" : "⚪ Inactive" },
                  ].map((item, i) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                      <p className="text-sm font-bold break-all">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground">الرصيد الحالي</p>
                    <p className="text-xl font-bold text-green-600">{detailUser.balance.toFixed(2)} $</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground">إجمالي الشحن</p>
                    <p className="text-xl font-bold text-blue-600">{detailUser.total_topup.toFixed(2)} $</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground">💸 إجمالي المسحوب</p>
                    <p className="text-xl font-bold text-red-600">
                      {detailWithdrawals.filter(w => w.status === "confirmed").reduce((s, w) => s + Number(w.amount), 0).toFixed(2)} $
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {detailWithdrawals.filter(w => w.status === "confirmed").length} عملية
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground">أرباح الفريق</p>
                    <p className="text-xl font-bold text-purple-600">{detailUser.team_earnings.toFixed(2)} $</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => { setDetailOpen(false); openBalanceDialog(detailUser, "add"); }}><ArrowUpCircle className="w-4 h-4 mr-2" /> إضافة رصيد</Button>
                  <Button className="flex-1" variant="destructive" onClick={() => { setDetailOpen(false); openBalanceDialog(detailUser, "subtract"); }}><ArrowDownCircle className="w-4 h-4 mr-2" /> خصم رصيد</Button>
                  <Button className="flex-1" variant="outline" onClick={() => handleImpersonate(detailUser)}><LogIn className="w-4 h-4 mr-2" /> دخول كـ User</Button>
                </div>
              </TabsContent>

              {/* Topups */}
              <TabsContent value="topups" className="mt-4">
                {detailTopups.length === 0 ? <p className="text-center text-muted-foreground py-6">لا توجد شحنات</p> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>المبلغ</TableHead><TableHead>النوع</TableHead><TableHead>الحالة</TableHead><TableHead>التاريخ</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {detailTopups.map(t => (
                        <TableRow key={t.id}>
                          <TableCell className="font-bold">{t.amount_usdt} USDT</TableCell>
                          <TableCell>{t.upgrade_to ? <Badge className="bg-purple-500 text-xs">ترقية</Badge> : <Badge variant="outline" className="text-xs">شحن</Badge>}</TableCell>
                          <TableCell><Badge variant={t.status === "confirmed" ? "default" : "destructive"} className="text-xs">{t.status === "confirmed" ? "✅" : t.status === "pending" ? "⏳" : "❌"}</Badge></TableCell>
                          <TableCell className="text-xs">{new Date(t.created_at).toLocaleDateString("en-GB")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              {/* Withdrawals */}
              <TabsContent value="withdrawals" className="mt-4">
                {detailWithdrawals.length === 0 ? <p className="text-center text-muted-foreground py-6">لا توجد سحوبات</p> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>المبلغ</TableHead><TableHead>الطريقة</TableHead><TableHead>الحالة</TableHead><TableHead>التاريخ</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {detailWithdrawals.map(w => (
                        <TableRow key={w.id}>
                          <TableCell className="font-bold text-red-500">{w.amount} USDT</TableCell>
                          <TableCell className="text-xs">{w.method}</TableCell>
                          <TableCell><Badge variant={w.status === "confirmed" ? "default" : "destructive"} className="text-xs">{w.status === "confirmed" ? "✅" : w.status === "pending" ? "⏳" : "❌"}</Badge></TableCell>
                          <TableCell className="text-xs">{new Date(w.created_at).toLocaleDateString("en-GB")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              {/* Team */}
              <TabsContent value="team" className="mt-4">
                {detailTeam.length === 0 ? <p className="text-center text-muted-foreground py-6">لا يوجد فريق بعد</p> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Account</TableHead><TableHead>Email</TableHead><TableHead>المستوى</TableHead><TableHead>الإجمالي</TableHead><TableHead>الحالة</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {detailTeam.map(m => (
                        <TableRow key={m.user_id}>
                          <TableCell className="font-mono text-xs font-bold">{m.user_id.slice(0,8).toUpperCase()}</TableCell>
                          <TableCell className="text-xs text-blue-600">{m.email}</TableCell>
                          <TableCell className="text-xs">{m.store_level}</TableCell>
                          <TableCell className="font-bold">{m.total_topup} $</TableCell>
                          <TableCell><Badge className={m.total_topup > 0 ? "bg-green-500" : "bg-gray-300 text-gray-600"} >{m.total_topup > 0 ? "✅" : "⏳"}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== BALANCE DIALOG ===== */}
      <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${balanceAction === "add" ? "text-green-600" : "text-red-600"}`}>
              {balanceAction === "add" ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
              {balanceAction === "add" ? "إضافة رصيد" : "خصم رصيد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <span className="text-muted-foreground">المستخدم: </span><span className="font-bold">{selectedUser?.email || selectedUser?.user_id.slice(0,8).toUpperCase()}</span>
              <br/>
              <span className="text-muted-foreground">الرصيد الحالي: </span><span className="font-bold text-green-600">{selectedUser?.balance.toFixed(2)} $</span>
            </div>
            <div>
              <Label>المبلغ ($) *</Label>
              <Input type="number" placeholder="مثال: 50" value={balanceAmount} onChange={e => setBalanceAmount(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>السبب (اختياري)</Label>
              <Select onValueChange={setBalanceReason}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="اختر السبب..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="مكافأة">🎁 مكافأة</SelectItem>
                  <SelectItem value="تصحيح خطأ">🔧 تصحيح خطأ</SelectItem>
                  <SelectItem value="ترقية">⬆️ ترقية</SelectItem>
                  <SelectItem value="استرداد">↩️ استرداد</SelectItem>
                  <SelectItem value="عقوبة">⚠️ عقوبة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBalanceDialogOpen(false)}>إلغاء</Button>
            <Button
              className={balanceAction === "add" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
              variant={balanceAction === "subtract" ? "destructive" : "default"}
              onClick={handleBalanceUpdate}
            >
              {balanceAction === "add" ? "✅ إضافة" : "⚠️ خصم"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== APPROVE TOPUP DIALOG ===== */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>تأكيد الموافقة على الشحن</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700 space-y-1">
              <p>🎁 سيتم إضافة <strong>5% bonus</strong> تلقائياً</p>
              <p>💰 سيتم إضافة <strong>${REFERRAL_COMMISSION}</strong> للمحيل</p>
              {selectedTopup?.upgrade_to && <p>⬆️ سيتم ترقية الباقة إلى <strong>{selectedTopup.upgrade_to}</strong></p>}
            </div>
            <div>
              <Label>المبلغ (USDT)</Label>
              <Input type="number" value={editedAmount} onChange={e => setEditedAmount(e.target.value)} className="mt-1" />
            </div>
            {selectedTopup?.screenshot_url && (
              <img src={selectedTopup.screenshot_url} className="w-full rounded-xl border max-h-48 object-contain cursor-pointer hover:opacity-80" onClick={() => { setImgUrl(selectedTopup.screenshot_url); setImgDialogOpen(true); }} />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>إلغاء</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleApprove} disabled={submitting}>{submitting ? "جاري..." : "✅ موافقة"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== LEVEL DIALOG ===== */}
      <Dialog open={levelDialogOpen} onOpenChange={setLevelDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>تغيير مستوى المتجر</DialogTitle></DialogHeader>
          <Select value={selectedLevel} onValueChange={setSelectedLevel}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STORE_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLevelDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleLevelUpdate}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DELETE DIALOG ===== */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-destructive">⚠️ حذف المستخدم</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">هل أنت متأكد من حذف <strong className="text-destructive">{userToDelete?.email || userToDelete?.user_id.slice(0,8).toUpperCase()}</strong>؟ لن يتمكن من الدخول للمنصة وسيتم حذف كل بياناته.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDeleteUser}>حذف نهائياً 🗑️</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== IMAGE ZOOM ===== */}
      <Dialog open={imgDialogOpen} onOpenChange={setImgDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>إثبات الدفع</DialogTitle></DialogHeader>
          {imgUrl && <img src={imgUrl} className="w-full rounded-xl" />}
        </DialogContent>
      </Dialog>

      {/* ===== WITHDRAW DETAIL MODAL ===== */}
      <Dialog open={withdrawDetailOpen} onOpenChange={setWithdrawDetailOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ArrowDownCircle className="w-5 h-5 text-red-500" />
              تفاصيل طلب السحب
            </DialogTitle>
          </DialogHeader>

          {selectedWithdraw && (
            <div className="space-y-4">
              {/* Amount hero */}
              <div className="bg-red-50 rounded-2xl p-4 text-center border border-red-100">
                <p className="text-xs text-red-400 mb-1">المبلغ المطلوب سحبه</p>
                <p className="text-4xl font-bold text-red-500">{selectedWithdraw.amount}</p>
                <p className="text-sm text-red-400 mt-1">USDT</p>
              </div>

              {/* Fields grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Account</p>
                  <p className="text-sm font-bold font-mono">{selectedWithdraw.user_id.slice(0,8).toUpperCase()}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">الطريقة</p>
                  <p className="text-sm font-bold">{selectedWithdraw.method}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">التاريخ</p>
                  <p className="text-sm font-bold">{new Date(selectedWithdraw.created_at).toLocaleDateString("en-GB")}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">عنوان المحفظة</p>
                  <p className="text-xs font-mono font-bold text-blue-700 break-all bg-blue-50 px-2 py-1.5 rounded-lg mt-1">
                    {selectedWithdraw.wallet_address || "—"}
                  </p>
                </div>
              </div>

              {/* Previous withdrawals history */}
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-muted-foreground">سجل السحبات السابقة</p>
                  <Badge variant="outline" className="text-xs">
                    {(selectedWithdraw.prevConfirmed || []).length} طلب
                  </Badge>
                </div>
                {(selectedWithdraw.prevConfirmed || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">لا توجد سحبات سابقة</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {(selectedWithdraw.prevConfirmed as any[]).map((pw: any, i: number) => (
                      <div key={pw.id || i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-4 text-center">{i + 1}</span>
                          <div>
                            <p className="text-xs font-bold text-foreground">{pw.amount} USDT</p>
                            <p className="text-xs text-muted-foreground">{new Date(pw.created_at).toLocaleDateString("en-GB")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{pw.method}</span>
                          {pw.status === "confirmed"  && <Badge className="bg-green-100 text-green-700 border-0 text-xs">✅ مقبول</Badge>}
                          {pw.status === "pending"    && <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">⏳ انتظار</Badge>}
                          {pw.status === "rejected"   && <Badge className="bg-red-100 text-red-700 border-0 text-xs">❌ مرفوض</Badge>}
                          {pw.status === "cancelled"  && <Badge className="bg-gray-100 text-gray-500 border-0 text-xs">↩️ ملغي</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Screenshot */}
              {selectedWithdraw.screenshot_url && (
                <div
                  className="cursor-pointer group relative rounded-xl overflow-hidden border"
                  onClick={() => { setImgUrl(selectedWithdraw.screenshot_url); setImgDialogOpen(true); }}
                >
                  <img src={selectedWithdraw.screenshot_url} className="w-full h-36 object-cover group-hover:opacity-80 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                    <ZoomIn className="w-7 h-7 text-white" />
                  </div>
                </div>
              )}

              {/* Upload screenshot */}
              {selectedWithdraw.status === "pending" && (
                <label className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-dashed cursor-pointer text-xs font-bold transition-colors ${selectedWithdraw.screenshot_url ? "border-green-300 text-green-600 bg-green-50" : "border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-500"}`}>
                  {uploadingWithdrawId === selectedWithdraw.id ? "جاري الرفع..." : selectedWithdraw.screenshot_url ? "✅ تم رفع الإثبات — اضغط لتغييره" : "📸 رفع صورة إثبات الإرسال"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleWithdrawScreenshot(selectedWithdraw.id, f); }} />
                </label>
              )}
            </div>
          )}

          {selectedWithdraw?.status === "pending" && (
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
                onClick={() => { handleApproveWithdraw(selectedWithdraw); setWithdrawDetailOpen(false); }}
              >
                <CheckCircle className="w-4 h-4 mr-1" /> تأكيد الإرسال
              </Button>
              <Button
                variant="destructive"
                className="flex-1 font-bold"
                onClick={() => { handleRejectWithdraw(selectedWithdraw); setWithdrawDetailOpen(false); }}
              >
                <XCircle className="w-4 h-4 mr-1" /> رفض + إرجاع
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;