import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, CheckCircle, XCircle, Lock, Plus, Minus, Edit, Users, Trash2, ZoomIn } from "lucide-react";
import { toast } from "sonner";

const ADMIN_USERNAME = "hassan";
const ADMIN_PASSWORD = "hassan";
const STORE_LEVELS = ["Small shop", "Medium shop", "Large shop", "Mega shop", "VIP"];
const REFERRAL_COMMISSION = 5;

const Admin = () => {
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [users, setUsers] = useState([]);
  const [topups, setTopups] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("topups");

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedTopup, setSelectedTopup] = useState(null);
  const [editedAmount, setEditedAmount] = useState("");

  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceAction, setBalanceAction] = useState("add");

  const [levelDialogOpen, setLevelDialogOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState("");

  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualTxid, setManualTxid] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const [selectedUserReferrals, setSelectedUserReferrals] = useState([]);
  const [selectedUserName, setSelectedUserName] = useState("");

  const [imgDialogOpen, setImgDialogOpen] = useState(false);
  const [imgUrl, setImgUrl] = useState("");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [upgrades, setUpgrades] = useState([]);

  const approvingRef = useRef(new Set());

  useEffect(() => { if (adminAuth) loadAll(); }, [adminAuth]);

  const handleAdminLogin = () => {
    if (adminUser === ADMIN_USERNAME && adminPass === ADMIN_PASSWORD) {
      setAdminAuth(true);
    } else {
      toast.error("Username أو Password غلط ❌");
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadUsers(), loadTopups(), loadWithdrawals(), loadUpgrades()]);
    setLoading(false);
  };

  const loadUsers = async () => {
    const { data: allUsers } = await supabase.from("users_with_email").select("*");
    if (!allUsers) return;

    // Get auth users emails via topups (we can get user_id → email mapping from auth)
    const usersWithStats = allUsers.map((u) => {
      const myCode = u.referral_code;
      const referrals = allUsers.filter((r) => r.referred_by === myCode);
      const paidReferrals = referrals.filter((r) => Number(r.total_topup) > 0);
      return {
        user_id: u.user_id,
        store_level: u.store_level,
        balance: Number(u.balance),
        total_topup: Number(u.total_topup),
        total_profit: Number(u.total_profit),
        referral_code: u.referral_code || "",
        referred_by: u.referred_by || "",
        referral_count: referrals.length,
        paid_referrals: paidReferrals.length,
        created_at: u.created_at,
        last_profit_update: u.last_profit_update,
        email: u.email || "",
        plain_password: u.plain_password || "",
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setUsers(usersWithStats);
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

  const openApproveDialog = (topup) => {
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

      const { data: store } = await supabase.from("user_stores").select("balance, total_topup, referred_by, store_level").eq("user_id", selectedTopup.user_id).single();
      if (store) {
        const bonus = Math.round(amount * 0.05 * 100) / 100;
        const totalCredit = amount + bonus;
        const updateData: any = {
          balance: Number(store.balance) + totalCredit,
          total_topup: Number(store.total_topup) + amount,
        };
        // If upgrade topup, update store level
        if (selectedTopup.upgrade_to) {
          updateData.store_level = selectedTopup.upgrade_to;
        }
        await supabase.from("user_stores").update(updateData).eq("user_id", selectedTopup.user_id);

        if (store.referred_by) {
          const { data: referrer } = await supabase.from("user_stores").select("balance, team_earnings").eq("referral_code", store.referred_by).single();
          if (referrer) {
            await supabase.from("user_stores").update({
              balance: Number(referrer.balance) + REFERRAL_COMMISSION,
              team_earnings: Number(referrer.team_earnings || 0) + REFERRAL_COMMISSION,
            }).eq("referral_code", store.referred_by);
            toast.success(`✅ ${amount} USDT + ${bonus} bonus${selectedTopup.upgrade_to ? ` + ترقية لـ ${selectedTopup.upgrade_to}` : ""} + $${REFERRAL_COMMISSION} للمحيل 🎁`);
          } else {
            toast.success(`✅ ${amount} USDT + ${bonus} bonus${selectedTopup.upgrade_to ? ` + ترقية لـ ${selectedTopup.upgrade_to}` : ""}`);
          }
        } else {
          toast.success(`✅ ${amount} USDT + ${bonus} bonus${selectedTopup.upgrade_to ? ` + ترقية لـ ${selectedTopup.upgrade_to}` : ""}`);
        }
      } else {
        await supabase.from("user_stores").insert({ user_id: selectedTopup.user_id, balance: amount, total_topup: amount });
        toast.success(`✅ تمت الموافقة`);
      }

      setApproveDialogOpen(false);
      await loadAll();
    } catch (err) { toast.error(err.message || "حدث خطأ"); }
    finally { approvingRef.current.delete(selectedTopup.id); setSubmitting(false); }
  };

  const handleReject = async (topupId) => {
    try {
      await supabase.from("topups").update({ status: "rejected" }).eq("id", topupId);
      toast.success("تم رفض الطلب");
      await loadTopups();
    } catch (err) { toast.error(err.message || "حدث خطأ"); }
  };

  const handleApproveWithdraw = async (w) => {
    try {
      await supabase.from("withdrawals").update({ status: "confirmed" }).eq("id", w.id);
      toast.success(`✅ تم تأكيد سحب ${w.amount} USDT`);
      await loadWithdrawals();
    } catch (err) { toast.error(err.message || "حدث خطأ"); }
  };

  const handleRejectWithdraw = async (w) => {
    try {
      const { data: store } = await supabase.from("user_stores").select("balance").eq("user_id", w.user_id).single();
      if (store) await supabase.from("user_stores").update({ balance: Number(store.balance) + Number(w.amount) }).eq("user_id", w.user_id);
      await supabase.from("withdrawals").update({ status: "rejected" }).eq("id", w.id);
      toast.success("تم رفض طلب السحب وإرجاع الرصيد");
      await loadAll();
    } catch (err) { toast.error(err.message || "حدث خطأ"); }
  };

  const openBalanceDialog = (user, action) => { setSelectedUser(user); setBalanceAction(action); setBalanceAmount(""); setBalanceDialogOpen(true); };

  const handleBalanceUpdate = async () => {
    if (!selectedUser || !balanceAmount || Number(balanceAmount) <= 0) { toast.error("أدخل مبلغ صحيح"); return; }
    const amount = Number(balanceAmount);
    const newBalance = balanceAction === "add" ? selectedUser.balance + amount : Math.max(0, selectedUser.balance - amount);
    try {
      await supabase.from("user_stores").update({ balance: newBalance }).eq("user_id", selectedUser.user_id);
      toast.success(balanceAction === "add" ? `✅ تمت إضافة ${amount} $` : `✅ تم خصم ${amount} $`);
      setBalanceDialogOpen(false);
      await loadUsers();
    } catch (err) { toast.error(err.message || "حدث خطأ"); }
  };

  const openLevelDialog = (user) => { setSelectedUser(user); setSelectedLevel(user.store_level); setLevelDialogOpen(true); };

  const handleLevelUpdate = async () => {
    if (!selectedUser || !selectedLevel) return;
    try {
      await supabase.from("user_stores").update({ store_level: selectedLevel }).eq("user_id", selectedUser.user_id);
      toast.success("✅ تم تحديث مستوى المتجر");
      setLevelDialogOpen(false);
      await loadUsers();
    } catch (err) { toast.error(err.message || "حدث خطأ"); }
  };

  const handleManualTopup = async () => {
    if (!manualTxid.trim() || !manualAmount || Number(manualAmount) <= 0) { toast.error("أدخل المعرف والمبلغ"); return; }
    setSubmitting(true);
    try {
      await supabase.from("topups").insert({ user_id: selectedUserId, txid: manualTxid.trim(), amount_usdt: Number(manualAmount), status: "confirmed" });
      const { data: store } = await supabase.from("user_stores").select("balance, total_topup, referred_by").eq("user_id", selectedUserId).single();
      if (store) {
        await supabase.from("user_stores").update({ balance: Number(store.balance) + Number(manualAmount), total_topup: Number(store.total_topup) + Number(manualAmount) }).eq("user_id", selectedUserId);
        if (store.referred_by) {
          const { data: referrer } = await supabase.from("user_stores").select("balance, team_earnings").eq("referral_code", store.referred_by).single();
          if (referrer) await supabase.from("user_stores").update({ balance: Number(referrer.balance) + REFERRAL_COMMISSION, team_earnings: Number(referrer.team_earnings || 0) + REFERRAL_COMMISSION }).eq("referral_code", store.referred_by);
        }
      } else {
        await supabase.from("user_stores").insert({ user_id: selectedUserId, balance: Number(manualAmount), total_topup: Number(manualAmount) });
      }
      toast.success("تمت إضافة الرصيد بنجاح!");
      setManualDialogOpen(false);
      await loadAll();
    } catch (err) { toast.error(err.message || "حدث خطأ"); }
    finally { setSubmitting(false); }
  };

  const handleImpersonate = async (user) => {
    if (!user.email || !user.plain_password) {
      toast.error("لا يوجد email أو password لهذا المستخدم");
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: user.plain_password,
      });
      if (error) throw error;
      window.open("/dashboard", "_blank");
      toast.success(`✅ دخلت كـ ${user.email}`);
    } catch (err) {
      toast.error(err.message || "حدث خطأ");
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await supabase.from("user_stores").delete().eq("user_id", userToDelete.user_id);
      await supabase.from("topups").delete().eq("user_id", userToDelete.user_id);
      await supabase.from("withdrawals").delete().eq("user_id", userToDelete.user_id);
      toast.success("✅ تم حذف المستخدم");
      setDeleteDialogOpen(false);
      await loadAll();
    } catch (err) { toast.error(err.message || "حدث خطأ"); }
  };

  const openReferralDialog = (user) => {
    setSelectedUserReferrals(users.filter(u => u.referred_by === user.referral_code));
    setSelectedUserName(user.user_id.slice(0, 8).toUpperCase());
    setReferralDialogOpen(true);
  };

  if (!adminAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-xl">Admin Panel</CardTitle>
            <p className="text-sm text-muted-foreground">أدخل بيانات الدخول</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input placeholder="username" value={adminUser} onChange={e => setAdminUser(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdminLogin()} />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" placeholder="••••••••" value={adminPass} onChange={e => setAdminPass(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdminLogin()} />
            </div>
            <Button className="w-full h-11 font-bold" onClick={handleAdminLogin}>دخول</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingTopups = topups.filter(t => t.status === "pending");
  const otherTopups = topups.filter(t => t.status !== "pending");
  const pendingWithdrawals = withdrawals.filter(w => w.status === "pending");
  const otherWithdrawals = withdrawals.filter(w => w.status !== "pending");

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">جاري التحميل...</p></div>;

  return (
    <div className="min-h-screen bg-background pb-28 pt-6">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">لوحة الإدارة</h1>
              <p className="text-sm text-muted-foreground">مرحباً {ADMIN_USERNAME} 👋</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setAdminAuth(false)}>خروج</Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          <Button variant={activeTab === "topups" ? "default" : "outline"} onClick={() => setActiveTab("topups")}>
            طلبات الشحن {pendingTopups.length > 0 && <Badge className="mr-2 bg-red-500">{pendingTopups.length}</Badge>}
          </Button>
          <Button variant={activeTab === "withdrawals" ? "default" : "outline"} onClick={() => setActiveTab("withdrawals")}>
            طلبات السحب {pendingWithdrawals.length > 0 && <Badge className="mr-2 bg-orange-500">{pendingWithdrawals.length}</Badge>}
          </Button>
          <Button variant={activeTab === "users" ? "default" : "outline"} onClick={() => setActiveTab("users")}>
            المستخدمون ({users.length})
          </Button>
          <Button variant={activeTab === "upgrades" ? "default" : "outline"} onClick={() => setActiveTab("upgrades")}>
            الترقيات {upgrades.length > 0 && <Badge className="mr-2 bg-purple-500">{upgrades.length}</Badge>}
          </Button>
        </div>

        {/* TOPUPS TAB */}
        {activeTab === "topups" && (
          <div className="space-y-6">
            {pendingTopups.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-orange-500">⏳ طلبات الشحن في الانتظار ({pendingTopups.length})</h2>
                {pendingTopups.map((t) => (
                  <Card key={t.id} className="border-orange-500/40">
                    <CardContent className="p-5">
                      <div className="flex flex-col md:flex-row gap-5">
                        {/* Screenshot - small, clickable */}
                        <div className="md:w-1/3">
                          {t.screenshot_url ? (
                            <div className="relative cursor-pointer group" onClick={() => { setImgUrl(t.screenshot_url); setImgDialogOpen(true); }}>
                              <img src={t.screenshot_url} alt="إثبات" className="w-full rounded-xl border object-cover h-40 group-hover:opacity-80 transition-opacity" />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <ZoomIn className="w-8 h-8 text-white drop-shadow-lg" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-40 rounded-xl border flex items-center justify-center bg-muted text-muted-foreground text-sm">لا يوجد إثبات</div>
                          )}
                        </div>
                        {/* Info */}
                        <div className="md:w-2/3 flex flex-col justify-between gap-3">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div><span className="text-muted-foreground">المبلغ:</span><span className="font-bold text-green-500 text-xl mr-2">{t.amount_usdt} USDT</span></div>
                            <div><span className="text-muted-foreground">Account ID:</span><span className="font-mono font-bold mr-2">{t.user_id.slice(0, 8).toUpperCase()}</span></div>
                            <div><span className="text-muted-foreground">التاريخ:</span><span className="mr-2">{new Date(t.created_at).toLocaleString("ar")}</span></div>
                            {t.upgrade_to && <div><span className="text-muted-foreground">ترقية إلى:</span><span className="font-bold text-purple-500 mr-2">{t.upgrade_to}</span></div>}
                          </div>
                          {t.upgrade_to && (
                            <div className="bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 text-xs text-purple-700 font-bold">
                              ⬆️ طلب ترقية — سيتم تغيير الباقة لـ {t.upgrade_to} عند القبول
                            </div>
                          )}
                          <div className="flex gap-3">
                            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white h-11 font-bold" onClick={() => openApproveDialog(t)}>
                              <CheckCircle className="w-4 h-4 mr-2" /> قبول
                            </Button>
                            <Button className="flex-1 h-11 font-bold" variant="destructive" onClick={() => handleReject(t.id)}>
                              <XCircle className="w-4 h-4 mr-2" /> رفض
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {pendingTopups.length === 0 && <Card className="border-dashed"><CardContent className="p-8 text-center text-muted-foreground">✅ لا توجد طلبات شحن في الانتظار</CardContent></Card>}
            {otherTopups.length > 0 && (
              <Card>
                <CardHeader><CardTitle>سجل الشحنات</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Account ID</TableHead><TableHead>المبلغ</TableHead><TableHead>نوع</TableHead><TableHead>الحالة</TableHead><TableHead>التاريخ</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {otherTopups.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-mono text-xs font-bold">{t.user_id.slice(0, 8).toUpperCase()}</TableCell>
                          <TableCell className="font-bold">{t.amount_usdt} USDT</TableCell>
                          <TableCell>{t.upgrade_to ? <Badge className="bg-purple-500">⬆️ ترقية</Badge> : <Badge variant="outline">شحن</Badge>}</TableCell>
                          <TableCell><Badge variant={t.status === "confirmed" ? "default" : "destructive"}>{t.status === "confirmed" ? "✅ مقبول" : "❌ مرفوض"}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("ar")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* WITHDRAWALS TAB */}
        {activeTab === "withdrawals" && (
          <div className="space-y-6">
            {pendingWithdrawals.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-orange-500">⏳ طلبات السحب ({pendingWithdrawals.length})</h2>
                {pendingWithdrawals.map((w) => (
                  <Card key={w.id} className="border-orange-500/40">
                    <CardContent className="p-5">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex gap-4"><span className="text-muted-foreground">Account ID:</span><span className="font-mono font-bold">{w.user_id.slice(0, 8).toUpperCase()}</span></div>
                          <div className="flex gap-4"><span className="text-muted-foreground">المبلغ:</span><span className="font-bold text-red-500 text-xl">{w.amount} USDT</span></div>
                          <div className="flex gap-4"><span className="text-muted-foreground">الطريقة:</span><span className="font-mono text-xs bg-muted px-2 py-1 rounded">{w.method}</span></div>
                          <div className="flex gap-4"><span className="text-muted-foreground">المحفظة:</span><span className="font-mono text-xs bg-blue-50 px-2 py-1 rounded text-blue-700 break-all">{w.wallet_address || "—"}</span></div>
                          <div className="flex gap-4"><span className="text-muted-foreground">التاريخ:</span><span className="text-xs">{new Date(w.created_at).toLocaleString("ar")}</span></div>
                        </div>
                        <div className="flex gap-3 items-end">
                          <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white h-11 font-bold" onClick={() => handleApproveWithdraw(w)}><CheckCircle className="w-4 h-4 mr-2" /> تأكيد</Button>
                          <Button className="flex-1 h-11 font-bold" variant="destructive" onClick={() => handleRejectWithdraw(w)}><XCircle className="w-4 h-4 mr-2" /> رفض</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {pendingWithdrawals.length === 0 && <Card className="border-dashed"><CardContent className="p-8 text-center text-muted-foreground">✅ لا توجد طلبات سحب</CardContent></Card>}
            {otherWithdrawals.length > 0 && (
              <Card>
                <CardHeader><CardTitle>سجل السحبات</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Account ID</TableHead><TableHead>المبلغ</TableHead><TableHead>المحفظة</TableHead><TableHead>الحالة</TableHead><TableHead>التاريخ</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {otherWithdrawals.map((w) => (
                        <TableRow key={w.id}>
                          <TableCell className="font-mono text-xs font-bold">{w.user_id.slice(0, 8).toUpperCase()}</TableCell>
                          <TableCell className="font-bold text-red-500">{w.amount} USDT</TableCell>
                          <TableCell className="font-mono text-xs max-w-[120px] truncate">{w.wallet_address || "—"}</TableCell>
                          <TableCell><Badge variant={w.status === "confirmed" ? "default" : "destructive"}>{w.status === "confirmed" ? "✅ مؤكد" : "❌ مرفوض"}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString("ar")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === "users" && (
          <Card>
            <CardHeader><CardTitle>المستخدمون ({users.length}) — مرتبون بتاريخ التسجيل</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>المستوى</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الرصيد</TableHead>
                    <TableHead>الإجمالي</TableHead>
                    <TableHead>تاريخ التسجيل</TableHead>
                    <TableHead>الرفيرالز</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell className="font-mono text-sm font-bold">{u.user_id.slice(0, 8).toUpperCase()}</TableCell>
                      <TableCell className="text-xs text-blue-600">{u.email || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="text-xs">{u.store_level}</span>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openLevelDialog(u)}><Edit className="w-3 h-3" /></Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.total_topup > 0 ? "default" : "secondary"} className={u.total_topup > 0 ? "bg-green-500" : ""}>
                          {u.total_topup > 0 ? "🟢 Active" : "⚪ Not Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-green-500">{u.balance.toFixed(2)} $</TableCell>
                      <TableCell className="text-sm">{u.total_topup.toFixed(2)} $</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{u.created_at ? new Date(u.created_at).toLocaleDateString("en-GB") : "—"}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => openReferralDialog(u)}>
                          <Users className="w-3 h-3" />
                          <span className="text-blue-500 font-bold">{u.referral_count}</span>
                          <span className="text-muted-foreground">|</span>
                          <span className="text-green-500 font-bold">{u.paid_referrals}</span>
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-8 px-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200" onClick={() => handleImpersonate(u)}>👁️</Button>
                          <Button size="sm" variant="destructive" className="h-8 px-2" onClick={() => { setUserToDelete(u); setDeleteDialogOpen(true); }}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

        {/* UPGRADES TAB */}
        {activeTab === "upgrades" && (
          <Card>
            <CardHeader><CardTitle>سجل الترقيات ({upgrades.length})</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              {upgrades.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد ترقيات بعد</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account ID</TableHead>
                      <TableHead>من</TableHead>
                      <TableHead>إلى</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>التاريخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upgrades.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-mono text-xs font-bold">{u.user_id.slice(0, 8).toUpperCase()}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">—</TableCell>
                        <TableCell><Badge className="bg-purple-500">⬆️ {u.upgrade_to}</Badge></TableCell>
                        <TableCell className="font-bold text-green-500">{u.amount_usdt} USDT</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleString("ar")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

      {/* Image Zoom Dialog */}
      <Dialog open={imgDialogOpen} onOpenChange={setImgDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>إثبات الدفع</DialogTitle></DialogHeader>
          {imgUrl && <img src={imgUrl} alt="screenshot" className="w-full rounded-xl" />}
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>⚠️ حذف المستخدم</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">هل أنت متأكد من حذف <span className="font-bold text-destructive">{userToDelete?.user_id.slice(0, 8).toUpperCase()}</span>؟ لن يتمكن من الدخول للمنصة.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDeleteUser}>حذف نهائياً</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Referral Dialog */}
      <Dialog open={referralDialogOpen} onOpenChange={setReferralDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>رفيرالز {selectedUserName}</DialogTitle></DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {selectedUserReferrals.length === 0 ? <p className="text-center text-muted-foreground py-4">لا يوجد رفيرالز بعد</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Account ID</TableHead><TableHead>المستوى</TableHead><TableHead>إجمالي الشحن</TableHead><TableHead>تاريخ التسجيل</TableHead><TableHead>الحالة</TableHead></TableRow></TableHeader>
                <TableBody>
                  {selectedUserReferrals.map((r) => (
                    <TableRow key={r.user_id}>
                      <TableCell className="font-mono text-xs font-bold">{r.user_id.slice(0, 8).toUpperCase()}</TableCell>
                      <TableCell className="text-xs">{r.store_level}</TableCell>
                      <TableCell className="font-bold text-sm">{r.total_topup} $</TableCell>
                      <TableCell className="text-xs">{r.created_at ? new Date(r.created_at).toLocaleDateString("ar") : "—"}</TableCell>
                      <TableCell><Badge variant={r.total_topup > 0 ? "default" : "secondary"}>{r.total_topup > 0 ? "✅ نشط" : "⏳ لم يخلص"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setReferralDialogOpen(false)}>إغلاق</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>تأكيد الموافقة</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">🎁 سيتم إضافة <strong>5% bonus</strong> + <strong>${REFERRAL_COMMISSION}</strong> للمحيل{selectedTopup?.upgrade_to ? ` + ترقية لـ ${selectedTopup.upgrade_to}` : ""}</div>
            <div><Label>المبلغ (USDT)</Label><Input type="number" value={editedAmount} onChange={e => setEditedAmount(e.target.value)} /></div>
            {selectedTopup?.screenshot_url && (
              <img src={selectedTopup.screenshot_url} alt="إثبات" className="w-full rounded-xl border max-h-48 object-contain cursor-pointer" onClick={() => { setImgUrl(selectedTopup.screenshot_url); setImgDialogOpen(true); }} />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>إلغاء</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleApprove} disabled={submitting}>{submitting ? "جاري..." : "✅ موافقة"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Balance Dialog */}
      <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{balanceAction === "add" ? "➕ إضافة رصيد" : "➖ خصم رصيد"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">الرصيد الحالي: <span className="font-bold text-green-500">{selectedUser?.balance.toFixed(2)} $</span></p>
            <div><Label>المبلغ ($)</Label><Input type="number" placeholder="مثال: 50" value={balanceAmount} onChange={e => setBalanceAmount(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBalanceDialogOpen(false)}>إلغاء</Button>
            <Button className={balanceAction === "add" ? "bg-green-600 hover:bg-green-700 text-white" : ""} variant={balanceAction === "subtract" ? "destructive" : "default"} onClick={handleBalanceUpdate}>{balanceAction === "add" ? "إضافة" : "خصم"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Level Dialog */}
      <Dialog open={levelDialogOpen} onOpenChange={setLevelDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>تغيير مستوى المتجر</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STORE_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLevelDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleLevelUpdate}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Topup Dialog */}
      <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>شحن يدوي</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>معرف المعاملة (TXID)</Label><Input placeholder="أدخل TXID" value={manualTxid} onChange={e => setManualTxid(e.target.value)} /></div>
            <div><Label>المبلغ (USDT)</Label><Input type="number" placeholder="مثال: 50" value={manualAmount} onChange={e => setManualAmount(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleManualTopup} disabled={submitting}>{submitting ? "جاري..." : "تأكيد"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;