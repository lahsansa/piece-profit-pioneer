import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Shield, CheckCircle, XCircle, Lock, Plus, Minus, Edit } from "lucide-react";
import { toast } from "sonner";

const ADMIN_USERNAME = "hassan";
const ADMIN_PASSWORD = "hassan";

const STORE_LEVELS = ["Small shop", "Medium shop", "Large shop", "Mega shop", "VIP"];

interface UserStore {
  user_id: string;
  store_level: string;
  balance: number;
  total_topup: number;
  total_profit: number;
}

interface Topup {
  id: string;
  user_id: string;
  amount_usdt: number;
  txid: string;
  status: string;
  created_at: string;
  screenshot_url?: string;
}

const Admin = () => {
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");

  const [users, setUsers] = useState<UserStore[]>([]);
  const [topups, setTopups] = useState<Topup[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"topups" | "users">("topups");

  // Approve with editable amount
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedTopup, setSelectedTopup] = useState<Topup | null>(null);
  const [editedAmount, setEditedAmount] = useState("");

  // Balance edit dialog
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserStore | null>(null);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceAction, setBalanceAction] = useState<"add" | "subtract">("add");

  // Level edit dialog
  const [levelDialogOpen, setLevelDialogOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState("");

  // Manual topup dialog
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualTxid, setManualTxid] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const approvingRef = useRef<Set<string>>(new Set());

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
    await Promise.all([loadUsers(), loadTopups()]);
    setLoading(false);
  };

  const loadUsers = async () => {
    const { data } = await supabase.from("user_stores").select("*");
    if (data) setUsers(data.map((u: any) => ({
      user_id: u.user_id,
      store_level: u.store_level,
      balance: Number(u.balance),
      total_topup: Number(u.total_topup),
      total_profit: Number(u.total_profit),
    })));
  };

  const loadTopups = async () => {
    const { data } = await supabase.from("topups").select("*").order("created_at", { ascending: false });
    if (data) setTopups(data as Topup[]);
  };

  // Open approve dialog with editable amount
  const openApproveDialog = (topup: Topup) => {
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
      const { data: store } = await supabase.from("user_stores").select("balance, total_topup").eq("user_id", selectedTopup.user_id).single();

      const { error } = await supabase.from("topups")
        .update({ status: "confirmed", amount_usdt: amount })
        .eq("id", selectedTopup.id)
        .eq("status", "pending");
      if (error) throw error;

      if (store) {
        await supabase.from("user_stores").update({
          balance: Number(store.balance) + amount,
          total_topup: Number(store.total_topup) + amount,
        }).eq("user_id", selectedTopup.user_id);
      } else {
        await supabase.from("user_stores").insert({ user_id: selectedTopup.user_id, balance: amount, total_topup: amount });
      }

      toast.success(`✅ تمت الموافقة — تم إضافة ${amount} USDT`);
      setApproveDialogOpen(false);
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      approvingRef.current.delete(selectedTopup.id);
      setSubmitting(false);
    }
  };

  const handleReject = async (topupId: string) => {
    try {
      await supabase.from("topups").update({ status: "rejected" }).eq("id", topupId);
      toast.success("تم رفض الطلب");
      await loadTopups();
    } catch (err: any) { toast.error(err.message || "حدث خطأ"); }
  };

  // Balance add/subtract
  const openBalanceDialog = (user: UserStore, action: "add" | "subtract") => {
    setSelectedUser(user);
    setBalanceAction(action);
    setBalanceAmount("");
    setBalanceDialogOpen(true);
  };

  const handleBalanceUpdate = async () => {
    if (!selectedUser || !balanceAmount || Number(balanceAmount) <= 0) { toast.error("أدخل مبلغ صحيح"); return; }
    const amount = Number(balanceAmount);
    const newBalance = balanceAction === "add"
      ? selectedUser.balance + amount
      : Math.max(0, selectedUser.balance - amount);

    try {
      await supabase.from("user_stores").update({ balance: newBalance }).eq("user_id", selectedUser.user_id);
      toast.success(balanceAction === "add" ? `✅ تمت إضافة ${amount} $` : `✅ تم خصم ${amount} $`);
      setBalanceDialogOpen(false);
      await loadUsers();
    } catch (err: any) { toast.error(err.message || "حدث خطأ"); }
  };

  // Store level edit
  const openLevelDialog = (user: UserStore) => {
    setSelectedUser(user);
    setSelectedLevel(user.store_level);
    setLevelDialogOpen(true);
  };

  const handleLevelUpdate = async () => {
    if (!selectedUser || !selectedLevel) return;
    try {
      await supabase.from("user_stores").update({ store_level: selectedLevel }).eq("user_id", selectedUser.user_id);
      toast.success("✅ تم تحديث مستوى المتجر");
      setLevelDialogOpen(false);
      await loadUsers();
    } catch (err: any) { toast.error(err.message || "حدث خطأ"); }
  };

  const handleManualTopup = async () => {
    if (!manualTxid.trim() || !manualAmount || Number(manualAmount) <= 0) { toast.error("أدخل المعرف والمبلغ"); return; }
    setSubmitting(true);
    try {
      await supabase.from("topups").insert({ user_id: selectedUserId, txid: manualTxid.trim(), amount_usdt: Number(manualAmount), status: "confirmed" });
      const { data: store } = await supabase.from("user_stores").select("balance, total_topup").eq("user_id", selectedUserId).single();
      if (store) {
        await supabase.from("user_stores").update({ balance: Number(store.balance) + Number(manualAmount), total_topup: Number(store.total_topup) + Number(manualAmount) }).eq("user_id", selectedUserId);
      } else {
        await supabase.from("user_stores").insert({ user_id: selectedUserId, balance: Number(manualAmount), total_topup: Number(manualAmount) });
      }
      toast.success("تمت إضافة الرصيد بنجاح!");
      setManualDialogOpen(false);
      await loadAll();
    } catch (err: any) { toast.error(err.message || "حدث خطأ"); }
    finally { setSubmitting(false); }
  };

  // ====== LOGIN ======
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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">جاري التحميل...</p></div>;

  return (
    <div className="min-h-screen bg-background pb-28 pt-6">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
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
        <div className="flex gap-2">
          <Button variant={activeTab === "topups" ? "default" : "outline"} onClick={() => setActiveTab("topups")}>
            طلبات الشحن {pendingTopups.length > 0 && <Badge className="mr-2 bg-red-500">{pendingTopups.length}</Badge>}
          </Button>
          <Button variant={activeTab === "users" ? "default" : "outline"} onClick={() => setActiveTab("users")}>
            المستخدمون
          </Button>
        </div>

        {/* TOPUPS TAB */}
        {activeTab === "topups" && (
          <div className="space-y-6">
            {pendingTopups.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-orange-500">⏳ طلبات في الانتظار ({pendingTopups.length})</h2>
                {pendingTopups.map((t) => (
                  <Card key={t.id} className="border-orange-500/40">
                    <CardContent className="p-5">
                      <div className="flex flex-col md:flex-row gap-5">
                        <div className="md:w-1/2">
                          {t.screenshot_url ? (
                            <img src={t.screenshot_url} alt="إثبات الدفع" className="w-full rounded-xl border object-contain max-h-80" />
                          ) : (
                            <div className="w-full h-40 rounded-xl border flex items-center justify-center bg-muted text-muted-foreground text-sm">لا يوجد إثبات دفع</div>
                          )}
                        </div>
                        <div className="md:w-1/2 flex flex-col justify-between gap-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground text-sm">المبلغ المطلوب:</span>
                              <span className="font-bold text-green-500 text-2xl">{t.amount_usdt} USDT</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground text-sm">Account ID:</span>
                              <span className="font-mono text-xs bg-muted px-2 py-1 rounded font-bold">{t.user_id.slice(0, 8).toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground text-sm">التاريخ:</span>
                              <span className="text-xs">{new Date(t.created_at).toLocaleString("ar")}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground text-sm">الحالة:</span>
                              <Badge className="bg-orange-500">⏳ في الانتظار</Badge>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12 text-base font-bold" onClick={() => openApproveDialog(t)}>
                              <CheckCircle className="w-5 h-5 mr-2" /> قبول
                            </Button>
                            <Button className="flex-1 h-12 text-base font-bold" variant="destructive" onClick={() => handleReject(t.id)}>
                              <XCircle className="w-5 h-5 mr-2" /> رفض
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {pendingTopups.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">✅ لا توجد طلبات في الانتظار</CardContent>
              </Card>
            )}

            {otherTopups.length > 0 && (
              <Card>
                <CardHeader><CardTitle>سجل الطلبات السابقة</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account ID</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>التاريخ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {otherTopups.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-mono text-xs font-bold">{t.user_id.slice(0, 8).toUpperCase()}</TableCell>
                          <TableCell className="font-bold">{t.amount_usdt} USDT</TableCell>
                          <TableCell>
                            <Badge variant={t.status === "confirmed" ? "default" : "destructive"}>
                              {t.status === "confirmed" ? "✅ مقبول" : "❌ مرفوض"}
                            </Badge>
                          </TableCell>
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

        {/* USERS TAB */}
        {activeTab === "users" && (
          <Card>
            <CardHeader><CardTitle>المستخدمون ({users.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account ID</TableHead>
                    <TableHead>مستوى المتجر</TableHead>
                    <TableHead>الرصيد</TableHead>
                    <TableHead>إجمالي الشحن</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell className="font-mono text-sm font-bold">{u.user_id.slice(0, 8).toUpperCase()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{u.store_level}</span>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openLevelDialog(u)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-green-500">{u.balance} $</TableCell>
                      <TableCell>{u.total_topup} $</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-8 px-2" onClick={() => openBalanceDialog(u, "add")}>
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="destructive" className="h-8 px-2" onClick={() => openBalanceDialog(u, "subtract")}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => { setSelectedUserId(u.user_id); setManualAmount(""); setManualTxid(""); setManualDialogOpen(true); }}>
                            + شحن
                          </Button>
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

      {/* Approve Dialog with editable amount */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>تأكيد الموافقة</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">يمكنك تعديل المبلغ قبل الموافقة</p>
            <div>
              <Label>المبلغ (USDT)</Label>
              <Input type="number" value={editedAmount} onChange={e => setEditedAmount(e.target.value)} />
            </div>
            {selectedTopup?.screenshot_url && (
              <img src={selectedTopup.screenshot_url} alt="إثبات" className="w-full rounded-xl border max-h-48 object-contain" />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>إلغاء</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleApprove} disabled={submitting}>
              {submitting ? "جاري..." : "✅ موافقة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Balance Dialog */}
      <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{balanceAction === "add" ? "➕ إضافة رصيد" : "➖ خصم رصيد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              الرصيد الحالي: <span className="font-bold text-green-500">{selectedUser?.balance} $</span>
            </p>
            <div>
              <Label>المبلغ ($)</Label>
              <Input type="number" placeholder="مثال: 50" value={balanceAmount} onChange={e => setBalanceAmount(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBalanceDialogOpen(false)}>إلغاء</Button>
            <Button className={balanceAction === "add" ? "bg-green-600 hover:bg-green-700 text-white" : ""} variant={balanceAction === "subtract" ? "destructive" : "default"} onClick={handleBalanceUpdate}>
              {balanceAction === "add" ? "إضافة" : "خصم"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Level Dialog */}
      <Dialog open={levelDialogOpen} onOpenChange={setLevelDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>تغيير مستوى المتجر</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <Label>اختر المستوى</Label>
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STORE_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
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
            <div>
              <Label>معرف المعاملة (TXID)</Label>
              <Input placeholder="أدخل TXID" value={manualTxid} onChange={e => setManualTxid(e.target.value)} />
            </div>
            <div>
              <Label>المبلغ (USDT)</Label>
              <Input type="number" placeholder="مثال: 50" value={manualAmount} onChange={e => setManualAmount(e.target.value)} />
            </div>
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