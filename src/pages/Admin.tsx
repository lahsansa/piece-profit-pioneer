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
import {
  Shield, CheckCircle, XCircle, Lock, Plus, Minus, Edit, Users, Trash2,
  ZoomIn, Eye, LogIn, ArrowUpCircle, ArrowDownCircle, Image as ImageIcon,
  Send, Paperclip, X, MessageCircle
} from "lucide-react";
import { toast } from "sonner";

// Admin emails allowed to access panel
const ADMIN_EMAILS = [
  "hassan@admin.com",
  "admin2@vertex.com",
];

const displayContact = (email: string) => {
  if (!email) return "—";
  if (email.includes("@vertex-app.com")) {
    return `📱 0${email.split("@")[0].slice(1)}`;
  }
  return email;
};
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
  is_frozen: boolean;
}

interface Message {
  id: string;
  user_id: string;
  sender: "user" | "admin";
  content: string;
  read: boolean;
  created_at: string;
}

// ===================== USER REPLIES COMPONENT =====================
const UserReplies = ({ userId, onSendReply }: { userId: string; onSendReply: (msg: string) => Promise<void> }) => {
  const [msgs, setMsgs] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("notifications")
        .select("*").eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (data) setMsgs(data);
    };
    load();
  }, [userId]);

  const send = async () => {
    if (!newMsg.trim()) return;
    setSending(true);
    await onSendReply(newMsg.trim());
    const { data } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: true });
    if (data) setMsgs(data);
    setNewMsg("");
    setSending(false);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {msgs.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-4">لا توجد رسائل بعد</p>
        ) : msgs.map(m => (
          <div key={m.id} className="space-y-1">
            <div className="bg-blue-50 rounded-xl px-3 py-2 text-sm text-blue-800 max-w-[85%]">
              <p className="text-xs text-blue-400 mb-0.5 font-bold">Admin 👤</p>
              <p>{m.message}</p>
              <p className="text-xs opacity-50 mt-0.5">{new Date(m.created_at).toLocaleString("ar")}</p>
            </div>
            {m.reply && (
              <div className="bg-green-50 rounded-xl px-3 py-2 text-sm text-green-800 max-w-[85%] mr-auto ml-4">
                <p className="text-xs text-green-400 mb-0.5 font-bold">User 💬</p>
                <p>{m.reply}</p>
                <p className="text-xs opacity-50 mt-0.5">{new Date(m.replied_at).toLocaleString("ar")}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-2 border-t">
        <input
          type="text"
          placeholder="اكتب رسالة لهذا المستخدم..."
          className="flex-1 text-sm rounded-xl px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-primary"
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
        />
        <button
          onClick={send}
          disabled={sending || !newMsg.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-xl disabled:opacity-50"
        >
          إرسال
        </button>
      </div>
    </div>
  );
};

// ===================== DUPLICATE IP DETECTOR =====================
const DuplicateIpDetector = ({ users }: { users: any[] }) => {
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_stores")
      .select("user_id, signup_ip, total_topup")
      .not("signup_ip", "is", null);

    if (!data) { setLoading(false); return; }

    const ipMap = new Map<string, any[]>();
    data.forEach((s: any) => {
      if (!s.signup_ip) return;
      if (!ipMap.has(s.signup_ip)) ipMap.set(s.signup_ip, []);
      ipMap.get(s.signup_ip)!.push(s);
    });

    const dups = Array.from(ipMap.entries())
      .filter(([, accounts]) => accounts.length >= 2)
      .map(([ip, accounts]) => ({ ip, accounts }));

    setDuplicates(dups);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <p className="text-xs text-muted-foreground">جاري التحميل...</p>;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">{duplicates.length === 0 ? "✅ لا توجد حسابات مشبوهة" : `${duplicates.length} IP مكرر`}</p>
        <button onClick={load} className="text-xs text-blue-500 hover:underline">🔄 تحديث</button>
      </div>
      {duplicates.map(({ ip, accounts }) => (
        <div key={ip} className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-xs font-bold text-red-700 mb-1">IP: {ip} — {accounts.length} حسابات</p>
          <div className="space-y-1">
            {accounts.map((a: any) => {
              const u = users.find(u => u.user_id === a.user_id);
              return (
                <p key={a.user_id} className="text-xs text-red-600">
                  {u?.email || a.user_id.slice(0, 8).toUpperCase()} — ${a.total_topup}
                </p>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

// ===================== MAIN ADMIN COMPONENT =====================
const Admin = () => {
  // --- Auth ---
  const [adminAuth, setAdminAuth] = useState(() => {
    return localStorage.getItem("adminAuth") === "true";
  });
  const [adminUser, setAdminUser] = useState(() => {
    return localStorage.getItem("adminUser") || "";
  });
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
  const chatChannelRef = useRef<any>(null);

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

  // --- Block user ---
  const [blockHours, setBlockHours] = useState("");

  // --- Delete ---
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // --- Search ---
  const [searchQuery, setSearchQuery] = useState("");

  // --- Admin Message ---
  const [msgDialogOpen, setMsgDialogOpen] = useState(false);
  const [msgUser, setMsgUser] = useState<UserRow | null>(null);
  const [msgText, setMsgText] = useState("");
  const [msgAll, setMsgAll] = useState(false);

  // --- Chat Panel ---
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [chatPanelUser, setChatPanelUser] = useState<UserRow | null>(null);
  const [chatPanelMessages, setChatPanelMessages] = useState<Message[]>([]);
  const [chatPanelInput, setChatPanelInput] = useState("");
  const [conversations, setConversations] = useState<any[]>([]);
  const [sendingImage, setSendingImage] = useState(false);
  const [zoomedChatImage, setZoomedChatImage] = useState<string | null>(null);

  // --- Question ---
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [questionUser, setQuestionUser] = useState<UserRow | null>(null);
  const [questionText, setQuestionText] = useState("");

  // --- Withdraw detail modal ---
  const [withdrawDetailOpen, setWithdrawDetailOpen] = useState(false);
  const [selectedWithdraw, setSelectedWithdraw] = useState<any>(null);

  // ===================== LOAD =====================
  useEffect(() => { if (adminAuth) loadAll(); }, [adminAuth]);

  // Auto refresh every 10 minutes
  useEffect(() => {
    if (!adminAuth) return;
    const interval = setInterval(() => { loadAll(); }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [adminAuth]);

  // Real-time notifications
  useEffect(() => {
    if (!adminAuth) return;

    const playSound = () => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.frequency.setValueAtTime(880, ctx.currentTime);
        oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.4);
      } catch (e) { }
    };

    const topupSub = supabase
      .channel("admin-topups")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "topups" }, async (payload) => {
        const t = payload.new as any;
        const { data: store } = await supabase.from("user_stores").select("store_level").eq("user_id", t.user_id).single();
        const currentPack = store?.store_level || "Unknown";
        const requestedPack = t.upgrade_to ? `➡️ ${t.upgrade_to}` : currentPack;
        playSound();
        toast.info(`💰 شحن جديد — ${t.amount_usdt} USDT | ${requestedPack} | ${t.user_id.slice(0, 8).toUpperCase()}`, { duration: 8000 });
        loadAll();
      })
      .subscribe();

    const withdrawSub = supabase
      .channel("admin-withdrawals")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "withdrawals" }, async (payload) => {
        const w = payload.new as any;
        const { data: store } = await supabase.from("user_stores").select("store_level").eq("user_id", w.user_id).single();
        const pack = store?.store_level || "Unknown";
        playSound();
        toast.warning(`📤 سحب جديد — ${w.amount} USDT | ${pack} | ${w.user_id.slice(0, 8).toUpperCase()}`, { duration: 8000 });
        loadAll();
      })
      .subscribe();

    const msgSub = supabase
      .channel("admin-messages-global")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as any;
        loadConversations();
        setChatPanelUser(prev => {
          if (prev && prev.user_id === m.user_id) {
            setChatPanelMessages(msgs => [...msgs, m]);
          }
          return prev;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(topupSub);
      supabase.removeChannel(withdrawSub);
      supabase.removeChannel(msgSub);
    };
  }, [adminAuth]);

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
      localStorage.setItem("adminAuth", "true");
      localStorage.setItem("adminUser", adminUser);
      setAdminAuth(true);
    } catch (err: any) {
      toast.error(err.message || "Email أو Password غلط ❌");
    } finally {
      setAdminLoginLoading(false);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadUsers(), loadTopups(), loadWithdrawals(), loadUpgrades(), loadWithdrawWindow(), loadConversations()]);
    setLoading(false);
  };

  const loadConversations = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false });
    if (!data) return;
    const map = new Map();
    data.forEach((m: any) => {
      if (!map.has(m.user_id)) map.set(m.user_id, m);
    });
    setConversations(Array.from(map.values()));
  };

  const openChatPanel = async (u: UserRow) => {
    setChatPanelUser(u);
    setChatPanelOpen(true);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("user_id", u.user_id)
      .order("created_at", { ascending: true });
    if (data) setChatPanelMessages(data);
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("user_id", u.user_id)
      .eq("sender", "user")
      .eq("read", false);

    if (chatChannelRef.current) supabase.removeChannel(chatChannelRef.current);
    chatChannelRef.current = supabase.channel("admin-chat-" + u.user_id)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `user_id=eq.${u.user_id}`
      }, (payload) => {
        const m = payload.new as Message;
        setChatPanelMessages(prev => [...prev, m]);
        if (m.sender === "user") {
          supabase.from("messages").update({ read: true }).eq("id", m.id);
          loadConversations();
        }
      })
      .subscribe();
  };

  const sendChatPanelMessage = async (content: string) => {
    if (!chatPanelUser) return;
    await supabase.from("messages").insert({
      user_id: chatPanelUser.user_id,
      sender: "admin",
      content,
      read: false,
    });
    await supabase.from("notifications").insert({
      user_id: chatPanelUser.user_id,
      message: "💬 لديك رسالة جديدة من الوكيل",
      type: "info",
      from_admin: true,
      read: false,
    });
  };

  const sendChatPanelImage = async (file: File) => {
    if (!chatPanelUser) return;
    setSendingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `admin_${chatPanelUser.user_id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-images")
        .upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(fileName);
      await supabase.from("messages").insert({
        user_id: chatPanelUser.user_id,
        sender: "admin",
        content: `[image]${urlData.publicUrl}`,
        read: false,
      });
      await supabase.from("notifications").insert({
        user_id: chatPanelUser.user_id,
        message: "💬 لديك رسالة جديدة من الوكيل (صورة)",
        type: "info",
        from_admin: true,
        read: false,
      });
      toast.success("✅ تم إرسال الصورة");
    } catch (err) {
      toast.error("حدث خطأ في إرسال الصورة");
    }
    setSendingImage(false);
  };

  const handleSendChatPanel = async () => {
    if (!chatPanelInput.trim()) return;
    await sendChatPanelMessage(chatPanelInput.trim());
    setChatPanelInput("");
  };

  const sendQuestion = async () => {
    if (!questionText.trim() || !questionUser) return;
    await supabase.from("messages").insert({
      user_id: questionUser.user_id,
      sender: "admin",
      content: `❓ ${questionText.trim()}`,
      read: false,
    });
    await supabase.from("notifications").insert({
      user_id: questionUser.user_id,
      message: "💬 لديك رسالة جديدة من الوكيل",
      type: "info",
      from_admin: true,
      read: false,
    });
    toast.success(`✅ تم إرسال السؤال لـ ${questionUser.email}`);
    setQuestionText("");
    setQuestionDialogOpen(false);
  };

  const renderChatMessage = (content: string) => {
    if (content.startsWith("[image]")) {
      const url = content.slice(7);
      return (
        <img
          src={url}
          className="max-w-[200px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setZoomedChatImage(url)}
          alt="Shared"
        />
      );
    }
    return <p>{content}</p>;
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
        is_frozen: u.is_frozen || false,
      };
    }).sort((a, b) => {
      if (a.total_topup > 0 && b.total_topup === 0) return -1;
      if (a.total_topup === 0 && b.total_topup > 0) return 1;
      if (a.total_topup > 0 && b.total_topup > 0) return b.balance - a.balance;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
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

  const handleImpersonate = (user: UserRow) => {
    const url = `/dashboard?impersonate=${user.user_id}`;
    window.open(url, "_blank");
    toast.success(`👁️ فتح dashboard ديال ${user.email || user.user_id.slice(0, 8).toUpperCase()}`);
  };

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
        const { data: confirmedTopups } = await supabase.from("topups").select("amount_usdt").eq("user_id", selectedTopup.user_id).eq("status", "confirmed");
        const realTopup = (confirmedTopups || []).reduce((s: number, t: any) => s + Number(t.amount_usdt), 0);

        const dailyProfit = realTopup >= 2000 ? 300 : realTopup >= 1500 ? 180 : realTopup >= 1000 ? 110 : realTopup >= 700 ? 75 : realTopup >= 320 ? 32 : realTopup >= 92 ? 9.5 : 0;

        const { data: firstTopup } = await supabase.from("topups").select("created_at").eq("user_id", selectedTopup.user_id).eq("status", "confirmed").order("created_at", { ascending: true }).limit(1).single();
        const firstDate = firstTopup ? new Date(firstTopup.created_at) : new Date();
        const daysActive = Math.floor((Date.now() - firstDate.getTime()) / 86400000);

        const { data: withdrawalsData } = await supabase.from("withdrawals").select("amount").eq("user_id", selectedTopup.user_id).eq("status", "confirmed");
        const totalWithdrawn = (withdrawalsData || []).reduce((s: number, w: any) => s + Number(w.amount), 0);

        const newBalance = Math.round(((realTopup * 1.05) + (daysActive * dailyProfit) - totalWithdrawn) * 100) / 100;

        const updateData: any = {
          balance: newBalance,
          total_topup: Number(store.total_topup) + amount,
        };
        if (selectedTopup.upgrade_to) updateData.store_level = selectedTopup.upgrade_to;
        await supabase.from("user_stores").update(updateData).eq("user_id", selectedTopup.user_id);

        if (store.referred_by) {
          const commission =
            amount >= 2200 ? 110 :
              amount >= 1650 ? 85 :
                amount >= 1100 ? 75 :
                  amount >= 750 ? 45 :
                    amount >= 350 ? 20 :
                      amount >= 99 ? 10 :
                        amount >= 45 ? 5 : 0;

          if (commission > 0) {
            const { data: ref } = await supabase.from("user_stores").select("balance, team_earnings, user_id").eq("referral_code", store.referred_by).single();
            if (ref) {
              await supabase.from("user_stores").update({
                balance: Number(ref.balance) + commission,
                team_earnings: Number(ref.team_earnings || 0) + commission
              }).eq("referral_code", store.referred_by);
              await supabase.from("notifications").insert({
                user_id: ref.user_id,
                message: `🎉 حصلت على عمولة $${commission} من دعوتك — باقة $${amount}`,
                type: "success",
              });
            }
          }
        }
        toast.success(`✅ تمت الموافقة — ${amount} USDT${selectedTopup.upgrade_to ? ` + ترقية لـ ${selectedTopup.upgrade_to}` : ""}`);
        await supabase.from("notifications").insert({
          user_id: selectedTopup.user_id,
          message: `✅ تمت الموافقة على شحنتك ${amount} USDT${selectedTopup.upgrade_to ? ` — تمت ترقيتك إلى ${selectedTopup.upgrade_to}` : ""}`,
          type: "success",
        });
      }
      setApproveDialogOpen(false);
      await loadAll();
    } catch (err: any) { toast.error(err.message || "حدث خطأ"); }
    finally { approvingRef.current.delete(selectedTopup.id); setSubmitting(false); }
  };

  const handleReject = async (id: string) => {
    const topup = topups.find(t => t.id === id);
    await supabase.from("topups").update({ status: "rejected" }).eq("id", id);
    if (topup) {
      await supabase.from("notifications").insert({
        user_id: topup.user_id,
        message: `❌ تم رفض طلب الشحن ${topup.amount_usdt} USDT — تواصل مع الدعم للمزيد`,
        type: "error",
      });
    }
    toast.success("تم رفض الطلب");
    await loadTopups();
  };

  const handleApproveWithdraw = async (w: any) => {
    await supabase.from("withdrawals").update({ status: "confirmed" }).eq("id", w.id);
    const { data: store } = await supabase.from("user_stores")
      .select("balance, total_profit").eq("user_id", w.user_id).single();
    if (store) {
      await supabase.from("user_stores")
        .update({
          balance: Math.max(0, Number(store.balance) - Number(w.amount)),
          total_profit: Math.max(0, Number(store.total_profit) - Number(w.amount)),
        })
        .eq("user_id", w.user_id);
    }
    await supabase.from("notifications").insert({
      user_id: w.user_id,
      message: `✅ تم تأكيد سحبك ${w.amount} USDT — تم الإرسال إلى محفظتك`,
      type: "success",
    });
    toast.success(`✅ تم تأكيد سحب ${w.amount} USDT`);
    await loadWithdrawals();
  };

  const handleRejectWithdraw = async (w: any) => {
    const { data: store } = await supabase.from("user_stores").select("balance").eq("user_id", w.user_id).single();
    if (store) await supabase.from("user_stores").update({ balance: Number(store.balance) + Number(w.amount) }).eq("user_id", w.user_id);
    await supabase.from("withdrawals").update({ status: "rejected" }).eq("id", w.id);
    await supabase.from("notifications").insert({
      user_id: w.user_id,
      message: `❌ تم رفض طلب السحب ${w.amount} USDT — تم إرجاع الرصيد لحسابك`,
      type: "error",
    });
    toast.success("تم رفض السحب وإرجاع الرصيد");
    await loadAll();
  };

  const openBalanceDialog = (user: UserRow, action: "add" | "subtract" | "subtract-profit") => {
    setSelectedUser(user);
    setBalanceAction(action as any);
    setBalanceAmount("");
    setBalanceReason("");
    setBalanceDialogOpen(true);
  };

  const handleBalanceUpdate = async () => {
    if (!selectedUser || !balanceAmount || Number(balanceAmount) <= 0) { toast.error("أدخل مبلغ صحيح"); return; }
    const amount = Number(balanceAmount);

    if (balanceAction === "subtract-profit") {
      const newProfit = Math.max(0, selectedUser.total_profit - amount);
      const newBalance = Math.max(0, selectedUser.balance - amount);
      await supabase.from("user_stores").update({
        total_profit: newProfit,
        balance: newBalance
      }).eq("user_id", selectedUser.user_id);
      toast.success(`✅ تم خصم ${amount} $ من الربح`);
    } else {
      const newBalance = balanceAction === "add" ? selectedUser.balance + amount : Math.max(0, selectedUser.balance - amount);
      await supabase.from("user_stores").update({ balance: newBalance }).eq("user_id", selectedUser.user_id);
      toast.success(balanceAction === "add" ? `✅ تمت إضافة ${amount} $` : `✅ تم خصم ${amount} $`);
    }
    setBalanceDialogOpen(false);
    await loadUsers();
  };

  const openLevelDialog = (user: UserRow) => { setSelectedUser(user); setSelectedLevel(user.store_level); setLevelDialogOpen(true); };
  const handleLevelUpdate = async () => {
    if (!selectedUser) return;
    await supabase.from("user_stores").update({ store_level: selectedLevel }).eq("user_id", selectedUser.user_id);
    toast.success("✅ تم تحديث المستوى");
    setLevelDialogOpen(false);
    await loadUsers();
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

  const handleBlockUser = async (u: any, hours?: number) => {
    const blockedSince = u.is_blocked ? u.blocked_since : new Date().toISOString();
    const blockedUntil = hours ? new Date(Date.now() + hours * 3600000).toISOString() : null;
    await supabase.from("user_stores").update({
      is_blocked: true,
      blocked_since: blockedSince,
      blocked_until: blockedUntil,
      last_profit_update: new Date().toISOString(),
    } as any).eq("user_id", u.user_id);
    toast.success(`🔒 تم حجب الحساب${hours ? ` لمدة ${hours} ساعة` : " بشكل دائم"}`);
    await loadUsers();
    setDetailOpen(false);
  };

  const handleUnblockUser = async (u: any) => {
    const blockedSince = u.blocked_since ? new Date(u.blocked_since) : new Date();
    const daysBlocked = Math.ceil((Date.now() - blockedSince.getTime()) / 86400000);
    const penalty = daysBlocked * 10;

    await supabase.from("topups").insert({
      user_id: u.user_id,
      amount_usdt: penalty,
      txid: `penalty_${u.user_id}_${Date.now()}`,
      status: "pending",
      screenshot_url: null,
      upgrade_to: null,
    });

    await supabase.from("user_stores").update({
      is_blocked: false,
      blocked_since: null,
      blocked_until: null,
      last_profit_update: new Date().toISOString(),
    } as any).eq("user_id", u.user_id);

    toast.success(`✅ تم فك الحجب — طلب عقوبة deposit: $${penalty} (${daysBlocked} يوم × $10)`);
    await loadUsers();
    await loadTopups();
    setDetailOpen(false);
  };

  const handleFreezeAll = async () => {
    await supabase.from("user_stores").update({ is_frozen: true } as any).gt("total_topup", 0);
    toast.success("🧊 تم تجميد جميع الحسابات");
    await loadUsers();
  };

  const handleUnfreezeAll = async () => {
    await supabase.from("user_stores").update({
      is_frozen: false,
      is_blocked: false,
      blocked_since: null,
      blocked_until: null,
    } as any).gt("total_topup", 0);
    toast.success("✅ تم فك تجميد جميع الحسابات");
    await loadUsers();
  };

  const handleFreezeUser = async (u: any) => {
    await supabase.from("user_stores").update({ is_frozen: true } as any).eq("user_id", u.user_id);
    toast.success("🧊 تم تجميد حساب " + u.email);
    await loadUsers();
  };

  const handleUnfreezeUser = async (u: any) => {
    await supabase.from("user_stores").update({
      is_frozen: false,
      is_blocked: false,
      blocked_since: null,
      blocked_until: null,
    } as any).eq("user_id", u.user_id);
    toast.success("✅ تم فك تجميد حساب " + u.email);
    await loadUsers();
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await supabase.rpc('delete_user_completely', { target_user_id: userToDelete.user_id });
      toast.success("✅ تم حذف المستخدم نهائياً من كل مكان");
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    }
    setDeleteDialogOpen(false);
    await loadAll();
  };

  const handleSendMessage = async () => {
    if (!msgText.trim()) return;
    if (msgAll) {
      const inserts = users.map(u => ({ user_id: u.user_id, message: msgText, type: "info", from_admin: true }));
      await supabase.from("notifications").insert(inserts);
      toast.success(`✅ تم إرسال الرسالة لـ ${users.length} مستخدم`);
    } else if (msgUser) {
      await supabase.from("notifications").insert({ user_id: msgUser.user_id, message: msgText, type: "info", from_admin: true });
      toast.success(`✅ تم إرسال الرسالة لـ ${msgUser.email}`);
    }
    setMsgText("");
    setMsgDialogOpen(false);
  };

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
  const totalRealTopup = users.reduce((s, u) => s + u.total_topup, 0);
  const totalWithdrawn = withdrawals.filter(w => w.status === "confirmed").reduce((s, w) => s + Number(w.amount), 0);
  const myBalance = totalRealTopup - totalWithdrawn;

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-center space-y-2"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" /><p className="text-muted-foreground">جاري التحميل...</p></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Image Zoom Modal for Chat */}
      {zoomedChatImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setZoomedChatImage(null)}
        >
          <img src={zoomedChatImage} className="max-w-full max-h-full rounded-2xl" />
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
            onClick={() => setZoomedChatImage(null)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ===== HEADER ===== */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-none">لوحة الإدارة</h1>
              <p className="text-xs text-muted-foreground">مرحباً {adminUser}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 justify-center flex-wrap">
            {[
              { label: "المستخدمون", value: users.length, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "ش.الشحن", value: pendingTopups.length, color: "text-orange-600", bg: "bg-orange-50" },
              { label: "ش.السحب", value: pendingWithdrawals.length, color: "text-red-600", bg: "bg-red-50" },
              { label: "الشحن", value: `${totalRealTopup.toFixed(0)}$`, color: "text-green-600", bg: "bg-green-50" },
              { label: "السحب", value: `${totalWithdrawn.toFixed(0)}$`, color: "text-red-500", bg: "bg-red-50" },
              { label: "Balance", value: `${myBalance.toFixed(0)}$`, color: "text-blue-600", bg: "bg-blue-50" },
            ].map((s, i) => (
              <div key={i} className={`${s.bg} rounded-lg px-2 py-1 text-center min-w-[60px]`}>
                <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-gray-500">{s.label}</p>
              </div>
            ))}
            {withdrawWindow && (
              <div className={`rounded-lg px-2 py-1 text-center ${withdrawWindow.is_open ? "bg-green-50" : "bg-red-50"}`}>
                {withdrawWindow.is_open ? (
                  <Button variant="destructive" size="sm" className="h-6 text-xs px-2" onClick={handleCloseWindow}>🔒 إغلاق</Button>
                ) : (
                  <Button className="bg-green-600 hover:bg-green-700 text-white h-6 text-xs px-2" size="sm" onClick={handleOpenWindow}>✅ فتح</Button>
                )}
                <p className="text-[10px] text-gray-500 mt-0.5">نافذة السحب</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button size="sm" className={`${users.filter(u => u.total_topup > 0).every(u => u.is_frozen) ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"} text-white`} onClick={users.filter(u => u.total_topup > 0).every(u => u.is_frozen) ? handleUnfreezeAll : handleFreezeAll}>
              {users.filter(u => u.total_topup > 0).every(u => u.is_frozen) ? "🔴 مجمد — اضغط للفك" : "🟢 نشط — اضغط للتجميد"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => loadAll()} title="تحديث">🔄</Button>
            <Button variant="outline" size="sm" onClick={() => { localStorage.removeItem("adminAuth"); localStorage.removeItem("adminUser"); setAdminAuth(false); }}>خروج</Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-3 space-y-3">

        {/* ===== TABS ===== */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "dashboard", label: "📊 الإحصائيات", count: 0, color: "" },
            { key: "topups", label: "طلبات الشحن", count: pendingTopups.length, color: "bg-red-500" },
            { key: "withdrawals", label: "طلبات السحب", count: pendingWithdrawals.length, color: "bg-orange-500" },
            { key: "users", label: `المستخدمون (${users.length})`, count: 0, color: "" },
            { key: "chat", label: "💬 المحادثات", count: conversations.filter(c => c.sender === "user" && !c.read).length, color: "bg-red-500" },
          ].map(tab => (
            <Button key={tab.key} variant={activeTab === tab.key ? "default" : "outline"} onClick={() => setActiveTab(tab.key)} className="relative">
              {tab.label}
              {tab.count > 0 && <Badge className={`mr-2 ${tab.color} text-white`}>{tab.count}</Badge>}
            </Button>
          ))}
        </div>

        {/* ===== DASHBOARD TAB ===== */}
        {activeTab === "dashboard" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">إجمالي المستخدمين</p>
                  <p className="text-3xl font-bold text-primary">{users.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">{users.filter(u => u.total_topup > 0).length} نشط</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">إجمالي الشحنات</p>
                  <p className="text-3xl font-bold text-green-600">${users.reduce((s, u) => s + u.total_topup, 0).toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{topups.filter(t => t.status === "confirmed").length} شحنة مؤكدة</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">إجمالي الأرباح الموزعة</p>
                  <p className="text-3xl font-bold text-blue-600">${users.reduce((s, u) => s + u.total_profit, 0).toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">كل المستخدمين</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">رصيد المنصة</p>
                  <p className="text-3xl font-bold text-purple-600">${users.reduce((s, u) => s + u.balance, 0).toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">إجمالي الأرصدة</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: "Small shop", color: "bg-orange-100 text-orange-700" },
                { name: "Medium shop", color: "bg-blue-100 text-blue-700" },
                { name: "Large shop", color: "bg-violet-100 text-violet-700" },
                { name: "Mega shop", color: "bg-pink-100 text-pink-700" },
              ].map(pack => {
                const packUsers = users.filter(u => u.store_level === pack.name && u.total_topup > 0);
                return (
                  <Card key={pack.name} className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{pack.name}</p>
                      <p className={`text-2xl font-bold ${pack.color.split(" ")[1]}`}>{packUsers.length}</p>
                      <p className="text-xs text-muted-foreground mt-1">${packUsers.reduce((s, u) => s + u.total_topup, 0).toFixed(0)}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <h3 className="text-sm font-bold mb-3">طلبات اليوم</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">شحنات اليوم</p>
                    <p className="text-2xl font-bold text-green-600">{topups.filter(t => new Date(t.created_at).toDateString() === new Date().toDateString()).length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">سحوبات اليوم</p>
                    <p className="text-2xl font-bold text-orange-600">{pendingWithdrawals.filter(w => new Date(w.created_at).toDateString() === new Date().toDateString()).length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">رسائل جديدة</p>
                    <p className="text-2xl font-bold text-blue-600">{conversations.filter(c => c.sender === "user" && !c.read).length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <h3 className="text-sm font-bold mb-3">⚠️ حسابات بنفس IP</h3>
                <DuplicateIpDetector users={users} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===== TOPUPS TAB ===== */}
        {activeTab === "topups" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 rounded-2xl p-3 text-center border border-green-100">
                <p className="text-xs text-green-600 mb-1">إجمالي الشحنات المقبولة</p>
                <p className="text-xl font-bold text-green-700">
                  {topups.filter(t => t.status === "confirmed").reduce((s, t) => s + Number(t.amount_usdt), 0).toFixed(2)} $
                </p>
              </div>
              <div className="bg-orange-50 rounded-2xl p-3 text-center border border-orange-100">
                <p className="text-xs text-orange-600 mb-1">طلبات في الانتظار</p>
                <p className="text-xl font-bold text-orange-700">
                  {topups.filter(t => t.status === "pending").reduce((s, t) => s + Number(t.amount_usdt), 0).toFixed(2)} $
                </p>
              </div>
              <div className="bg-blue-50 rounded-2xl p-3 text-center border border-blue-100">
                <p className="text-xs text-blue-600 mb-1">عدد الشاحنين</p>
                <p className="text-xl font-bold text-blue-700">
                  {new Set(topups.filter(t => t.status === "confirmed").map(t => t.user_id)).size} شخص
                </p>
              </div>
            </div>
            {pendingTopups.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-orange-600">⏳ في الانتظار ({pendingTopups.length})</h2>
                {pendingTopups.map(t => {
                  const userInfo = users.find(u => u.user_id === t.user_id);
                  const userEmail = userInfo?.email || "—";
                  const userPack = userInfo?.store_level || "—";
                  return (
                    <Card key={t.id} className="border-orange-200 shadow-sm">
                      <CardContent className="p-3">
                        <div className="flex gap-3 items-center">
                          <div className="w-16 h-16 flex-shrink-0 cursor-pointer group relative rounded-lg overflow-hidden border" onClick={() => { setImgUrl(t.screenshot_url); setImgDialogOpen(true); }}>
                            {t.screenshot_url ? (
                              <>
                                <img src={t.screenshot_url} className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20">
                                  <ZoomIn className="w-4 h-4 text-white" />
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">—</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-green-600">{t.amount_usdt} USDT</span>
                              <span className="font-mono text-xs text-muted-foreground">{t.user_id.slice(0, 8).toUpperCase()}</span>
                              <Badge className="text-xs bg-slate-100 text-slate-700 border-0">{userPack}</Badge>
                              {t.upgrade_to && <Badge className="bg-purple-500 text-xs">⬆️ {t.upgrade_to}</Badge>}
                            </div>
                            <p className="text-xs text-blue-600 truncate mt-0.5">{userEmail}</p>
                            <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 text-xs font-bold" onClick={() => openApproveDialog(t)}><CheckCircle className="w-3 h-3 mr-1" /> قبول</Button>
                            <Button className="h-8 px-3 text-xs font-bold" variant="destructive" onClick={() => handleReject(t.id)}><XCircle className="w-3 h-3 mr-1" /> رفض</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
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
                          <TableCell className="font-mono text-xs font-bold">{t.user_id.slice(0, 8).toUpperCase()}</TableCell>
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
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 rounded-2xl p-3 text-center border border-green-100">
                <p className="text-xs text-green-600 mb-1">إجمالي السحبات المقبولة</p>
                <p className="text-xl font-bold text-green-700">
                  {withdrawals.filter(w => w.status === "confirmed").reduce((s, w) => s + Number(w.amount), 0).toFixed(2)} $
                </p>
              </div>
              <div className="bg-orange-50 rounded-2xl p-3 text-center border border-orange-100">
                <p className="text-xs text-orange-600 mb-1">طلبات في الانتظار</p>
                <p className="text-xl font-bold text-orange-700">
                  {withdrawals.filter(w => w.status === "pending").reduce((s, w) => s + Number(w.amount), 0).toFixed(2)} $
                </p>
              </div>
              <div className="bg-blue-50 rounded-2xl p-3 text-center border border-blue-100">
                <p className="text-xs text-blue-600 mb-1">عدد المستفيدين</p>
                <p className="text-xl font-bold text-blue-700">
                  {new Set(withdrawals.filter(w => w.status === "confirmed").map(w => w.user_id)).size} شخص
                </p>
              </div>
            </div>

            {pendingWithdrawals.length > 0 ? (
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-orange-600 px-1">⏳ في الانتظار ({pendingWithdrawals.length})</h2>
                <Card className="shadow-sm overflow-hidden">
                  <div className="divide-y divide-border">
                    {pendingWithdrawals.map(w => {
                      const prevConfirmed = withdrawals.filter(x => x.user_id === w.user_id && x.id !== w.id);
                      const userTotalWithdrawn = withdrawals.filter(x => x.user_id === w.user_id && x.status === "confirmed").reduce((s, x) => s + Number(x.amount), 0);
                      const userInfo = users.find(u => u.user_id === w.user_id);
                      const userEmail = userInfo?.email || "—";
                      const userPack = userInfo?.store_level || "—";
                      const hasDuplicates = pendingWithdrawals.filter(x => x.user_id === w.user_id).length > 1;
                      return (
                        <div
                          key={w.id}
                          className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${hasDuplicates ? "bg-red-50" : ""}`}
                          onClick={() => { setSelectedWithdraw({ ...w, prevConfirmed }); setWithdrawDetailOpen(true); }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-orange-600">{w.user_id.slice(0, 2).toUpperCase()}</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-bold font-mono">{w.user_id.slice(0, 8).toUpperCase()}</p>
                                <Badge className="text-xs bg-slate-100 text-slate-700 border-0">{userPack}</Badge>
                                {hasDuplicates && <Badge className="bg-red-500 text-white text-xs">طلبات متعددة</Badge>}
                              </div>
                              <p className="text-xs text-blue-600">{userEmail}</p>
                              <p className="text-xs text-muted-foreground">{w.method} · {new Date(w.created_at).toLocaleDateString("en-GB")}</p>
                              <p className="text-xs text-blue-600 font-medium">إجمالي سحباته: {userTotalWithdrawn.toFixed(2)} $</p>
                            </div>
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
                              <span className="text-xs font-bold text-slate-500">{w.user_id.slice(0, 2).toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="text-sm font-bold font-mono">{w.user_id.slice(0, 8).toUpperCase()}</p>
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
          <div className="space-y-2">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle>المستخدمون ({users.length})</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button size="sm" className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white" onClick={() => { setMsgAll(true); setMsgUser(null); setMsgDialogOpen(true); }}>💬 رسالة للكل</Button>
                    <Input
                      placeholder="🔍 بحث بـ email أو ID..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="h-8 text-xs w-48"
                    />
                    <div className="text-sm text-green-600 font-bold">💰 {totalBalance.toFixed(0)}$</div>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { name: "Small shop", color: "bg-orange-50 border-orange-200", text: "text-orange-700" },
                    { name: "Medium shop", color: "bg-blue-50 border-blue-200", text: "text-blue-700" },
                    { name: "Large shop", color: "bg-violet-50 border-violet-200", text: "text-violet-700" },
                    { name: "Mega shop", color: "bg-pink-50 border-pink-200", text: "text-pink-700" },
                    { name: "VIP", color: "bg-amber-50 border-amber-200", text: "text-amber-700" },
                  ].map(pack => {
                    const packUsers = users.filter(u => u.store_level === pack.name && u.total_topup > 0);
                    const packTotal = packUsers.reduce((s, u) => s + u.total_topup, 0);
                    return (
                      <div key={pack.name} className={`${pack.color} rounded-xl px-3 py-1.5 border flex items-center gap-2`}>
                        <span className={`text-xs font-bold ${pack.text}`}>{pack.name}</span>
                        <span className={`text-sm font-bold ${pack.text}`}>{packUsers.length}</span>
                        <span className={`text-xs ${pack.text} opacity-70`}>{packTotal.toFixed(0)}$</span>
                      </div>
                    );
                  })}
                  <div className="bg-gray-100 border-gray-200 rounded-xl px-3 py-1.5 border flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500">⚪ Inactive</span>
                    <span className="text-sm font-bold text-gray-600">{users.filter(u => u.total_topup === 0).length}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="overflow-auto p-0 max-h-[70vh]">
                <Table>
                  <TableHeader className="sticky top-0 z-10">
                    <TableRow className="bg-slate-50">
                      <TableHead className="pl-4">Account</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>المستوى</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>إجمالي الربح</TableHead>
                      <TableHead>الباقة</TableHead>
                      <TableHead>التسجيل</TableHead>
                      <TableHead>فريق</TableHead>
                      <TableHead className="pr-4">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.filter(u => {
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      return u.email.toLowerCase().includes(q) || u.user_id.toLowerCase().includes(q);
                    }).map(u => (
                      <TableRow key={u.user_id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => openDetail(u)}>
                        <TableCell className="font-mono text-xs font-bold pl-4">{u.user_id.slice(0, 8).toUpperCase()}</TableCell>
                        <TableCell className="text-xs text-blue-600 max-w-[140px] truncate">
                          {u.email?.includes("@vertex-app.com")
                            ? `📱 0${u.email.split("@")[0].slice(1)}`
                            : u.email || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Badge className={`text-xs ${u.total_topup === 0 ? "bg-gray-300 text-gray-600" :
                                u.store_level === "VIP" ? "bg-amber-500" :
                                  u.store_level === "Mega shop" ? "bg-pink-500" :
                                    u.store_level === "Large shop" ? "bg-violet-500" :
                                      u.store_level === "Medium shop" ? "bg-blue-500" :
                                        "bg-orange-500"
                              }`}>
                              {u.total_topup === 0 ? "❌ لا" : u.store_level}
                            </Badge>
                            <Button size="sm" variant="ghost" className="h-5 w-5 p-0 opacity-50 hover:opacity-100" onClick={() => openLevelDialog(u)}><Edit className="w-3 h-3" /></Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${u.total_topup > 0 ? "bg-green-500" : "bg-gray-300 text-gray-600"}`}>
                            {u.total_topup > 0 ? "🟢 Active" : "⚪ Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-green-600">{u.total_profit.toFixed(2)}</TableCell>
                        <TableCell className="text-sm text-blue-600 font-bold">
                          {u.total_topup >= 2200 ? "$2200" :
                            u.total_topup >= 1650 ? "$1650" :
                              u.total_topup >= 1100 ? "$1100" :
                                u.total_topup >= 651 ? "$750" :
                                  u.total_topup >= 291 ? "$350" :
                                    u.total_topup >= 81 ? "$99" :
                                      u.total_topup >= 45 ? "$45" : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{u.created_at ? new Date(u.created_at).toLocaleDateString("en-GB") : "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => openDetail(u)}>
                            <Users className="w-3 h-3 mr-1" />{u.referral_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-4" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0" title="عرض التفاصيل" onClick={() => openDetail(u)}><Eye className="w-3 h-3" /></Button>
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-emerald-600 border-emerald-200 hover:bg-emerald-50 relative" title="محادثة" onClick={() => openChatPanel(u)}>
                              💬
                              {conversations.find(c => c.user_id === u.user_id && c.sender === "user" && !c.read) && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white" />
                              )}
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-orange-600 border-orange-200 hover:bg-orange-50" title="إرسال سؤال" onClick={() => { setQuestionUser(u); setQuestionDialogOpen(true); }}>❓</Button>
                            <Button size="sm" className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700 text-white" title="إضافة رصيد" onClick={() => openBalanceDialog(u, "add")}><ArrowUpCircle className="w-3 h-3" /></Button>
                            <Button size="sm" variant="destructive" className="h-7 w-7 p-0" title="خصم رصيد" onClick={() => openBalanceDialog(u, "subtract")}><ArrowDownCircle className="w-3 h-3" /></Button>
                            <Button size="sm" className="h-7 w-7 p-0 bg-orange-500 hover:bg-orange-600 text-white" title="خصم من الربح فقط" onClick={() => openBalanceDialog(u, "subtract-profit" as any)}>💸</Button>
                            <Button size="sm" className="h-7 w-7 p-0 bg-gray-500 hover:bg-gray-600 text-white" title="حذف الباقة" onClick={async () => {
                              if (!confirm(`واش تبغي تحذف باقة ${u.email}؟`)) return;
                              await supabase.from("user_stores").update({ total_topup: 0, store_level: "Small shop" } as any).eq("user_id", u.user_id);
                              toast.success("✅ تم حذف الباقة");
                              await loadUsers();
                            }}>🚫</Button>
                            <Button
                              size="sm"
                              className={`h-7 w-7 p-0 ${u.is_frozen ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white`}
                              title={u.is_frozen ? "فك التجميد" : "تجميد"}
                              onClick={() => u.is_frozen ? handleUnfreezeUser(u) : handleFreezeUser(u)}
                            >
                              {u.is_frozen ? "🔴" : "🟢"}
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-blue-600 border-blue-200 hover:bg-blue-50" title="دخول كـ هذا المستخدم" onClick={() => handleImpersonate(u)}><LogIn className="w-3 h-3" /></Button>
                            <Button size="sm" variant="destructive" className="h-7 w-7 p-0 opacity-60 hover:opacity-100" title="حذف" onClick={() => { setUserToDelete(u); setDeleteDialogOpen(true); }}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===== CHAT TAB ===== */}
        {activeTab === "chat" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[70vh]">
            {/* قائمة المحادثات */}
            <Card className="shadow-sm overflow-hidden">
              <CardHeader className="p-3 border-b">
                <CardTitle className="text-sm flex items-center gap-2">
                  💬 المحادثات ({conversations.length})
                  {conversations.filter(c => c.sender === "user" && !c.read).length > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {conversations.filter(c => c.sender === "user" && !c.read).length} جديد
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <div className="overflow-y-auto h-full divide-y">
                {conversations.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">لا توجد محادثات بعد</p>
                ) : conversations.map(c => {
                  const userInfo = users.find(u => u.user_id === c.user_id);
                  const unreadFromUser = c.sender === "user" && !c.read;
                  return (
                    <div
                      key={c.user_id}
                      className={`p-3 cursor-pointer hover:bg-slate-50 transition-colors ${chatPanelUser?.user_id === c.user_id ? "bg-emerald-50 border-r-2 border-emerald-500" : ""}`}
                      onClick={() => {
                        const u = users.find(x => x.user_id === c.user_id);
                        if (u) openChatPanel(u);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="relative w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-emerald-600">{c.user_id.slice(0, 2).toUpperCase()}</span>
                          {unreadFromUser && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate">{displayContact(userInfo?.email || "") || c.user_id.slice(0, 8).toUpperCase()}</p>
                          <p className={`text-xs truncate ${unreadFromUser ? "text-red-500 font-bold" : "text-muted-foreground"}`}>
                            {c.content.startsWith("[image]") ? "📷 صورة" : c.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* نافذة المحادثة */}
            <Card className="shadow-sm col-span-2 flex flex-col overflow-hidden">
              {!chatPanelUser ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  اختر محادثة للرد
                </div>
              ) : (
                <>
                  <CardHeader className="p-3 border-b flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-emerald-600">{chatPanelUser.user_id.slice(0, 2).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold">{displayContact(chatPanelUser.email)}</p>
                          <p className="text-xs text-muted-foreground">{chatPanelUser.store_level}</p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (!confirm("واش تبغي تنهي المحادثة وتمسح كل الرسائل؟")) return;
                          const { error } = await supabase.from("messages").delete().eq("user_id", chatPanelUser.user_id);
                          if (error) { toast.error("حدث خطأ: " + error.message); return; }
                          setChatPanelMessages([]);
                          setChatPanelUser(null);
                          await loadConversations();
                          toast.success("✅ تم إنهاء المحادثة ومسح الرسائل");
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                      >🔴 إنهاء المحادثة</button>
                    </div>
                  </CardHeader>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chatPanelMessages.map(m => {
                      const isImage = m.content.startsWith("[image]");
                      const imageUrl = isImage ? m.content.slice(7) : null;
                      return (
                        <div key={m.id} className={`flex ${m.sender === "user" ? "justify-start" : "justify-end"}`}>
                          <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                            m.sender === "user"
                              ? "bg-slate-100 text-slate-800 rounded-tl-sm"
                              : "bg-emerald-500 text-white rounded-tr-sm"
                          }`}>
                            {isImage ? (
                              <img
                                src={imageUrl!}
                                className="max-w-[200px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setZoomedChatImage(imageUrl!)}
                                alt="Shared"
                              />
                            ) : (
                              <p>{m.content}</p>
                            )}
                            <p className="text-[10px] opacity-60 mt-0.5">
                              {new Date(m.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-3 border-t flex gap-2 flex-shrink-0">
                    <label className="cursor-pointer flex items-center justify-center w-10 h-10 rounded-xl bg-muted hover:bg-muted/80 transition-colors flex-shrink-0">
                      <ImageIcon className="w-5 h-5 text-muted-foreground" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !chatPanelUser) return;
                          await sendChatPanelImage(file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <Input
                      placeholder="اكتب ردك..."
                      value={chatPanelInput}
                      onChange={e => setChatPanelInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSendChatPanel()}
                      className="text-sm"
                    />
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSendChatPanel}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}
            </Card>
          </div>
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
                        <TableCell className="font-mono text-xs font-bold">{u.user_id.slice(0, 8).toUpperCase()}</TableCell>
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
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                تفاصيل المستخدم — {detailUser?.user_id.slice(0, 8).toUpperCase()}
              </div>
              {detailUser && (
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1 text-xs" onClick={() => handleImpersonate(detailUser)}>
                  <LogIn className="w-3 h-3" /> عرض الحساب
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {detailUser && (
            <Tabs defaultValue="overview" dir="rtl">
              <TabsList className="w-full grid grid-cols-5">
                <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
                <TabsTrigger value="topups">الشحنات</TabsTrigger>
                <TabsTrigger value="withdrawals">السحوبات</TabsTrigger>
                <TabsTrigger value="messages">💬 الردود</TabsTrigger>
                <TabsTrigger value="team">الفريق</TabsTrigger>
              </TabsList>

              {/* Overview */}
              <TabsContent value="overview" className="space-y-3 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Email", value: detailUser.email?.includes("@vertex-app.com") ? `📱 0${detailUser.email.split("@")[0].slice(1)}` : detailUser.email },
                    { label: "Account ID", value: detailUser.user_id.slice(0, 8).toUpperCase() },
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
                <div className="flex gap-2">
                  {(detailUser as any).is_frozen ? (
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleUnfreezeUser(detailUser)}>
                      🔓 فك التجميد
                    </Button>
                  ) : (
                    <Button className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white" onClick={() => handleFreezeUser(detailUser)}>
                      🧊 تجميد الحساب
                    </Button>
                  )}
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
                          <TableCell className="font-bold text-sm">{t.amount_usdt} USDT</TableCell>
                          <TableCell>{t.upgrade_to ? <Badge className="bg-purple-500 text-xs">⬆️ {t.upgrade_to}</Badge> : <Badge variant="outline" className="text-xs">شحن</Badge>}</TableCell>
                          <TableCell><Badge variant={t.status === "confirmed" ? "default" : t.status === "pending" ? "outline" : "destructive"} className="text-xs">{t.status === "confirmed" ? "✅" : t.status === "pending" ? "⏳" : "❌"}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</TableCell>
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
                          <TableCell className="font-bold text-red-500 text-sm">{w.amount} USDT</TableCell>
                          <TableCell className="text-xs">{w.method}</TableCell>
                          <TableCell><Badge variant={w.status === "confirmed" ? "default" : w.status === "pending" ? "outline" : "destructive"} className="text-xs">{w.status === "confirmed" ? "✅" : w.status === "pending" ? "⏳" : "❌"}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              {/* Messages & Replies */}
              <TabsContent value="messages" className="mt-4 space-y-3">
                <UserReplies userId={detailUser.user_id} onSendReply={async (msg) => {
                  await supabase.from("notifications").insert({ user_id: detailUser.user_id, message: msg, type: "info", from_admin: true });
                  toast.success("✅ تم إرسال الرسالة");
                }} />
              </TabsContent>

              {/* Team */}
              <TabsContent value="team" className="mt-4">
                {detailTeam.length === 0 ? <p className="text-center text-muted-foreground py-6">لا يوجد فريق بعد</p> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Account</TableHead><TableHead>Email</TableHead><TableHead>المستوى</TableHead><TableHead>الإجمالي</TableHead><TableHead>الحالة</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {detailTeam.map(m => (
                        <TableRow key={m.user_id}>
                          <TableCell className="font-mono text-xs font-bold">{m.user_id.slice(0, 8).toUpperCase()}</TableCell>
                          <TableCell className="text-xs text-blue-600">{displayContact(m.email)}</TableCell>
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
            <DialogTitle className={`flex items-center gap-2 ${balanceAction === "add" ? "text-green-600" : balanceAction === "subtract-profit" ? "text-orange-600" : "text-red-600"}`}>
              {balanceAction === "add" ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
              {balanceAction === "add" ? "إضافة رصيد" : balanceAction === "subtract-profit" ? "💸 خصم من الربح فقط" : "خصم رصيد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <span className="text-muted-foreground">المستخدم: </span><span className="font-bold">{selectedUser?.email || selectedUser?.user_id.slice(0, 8).toUpperCase()}</span>
              <br />
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

      {/* ===== QUESTION DIALOG ===== */}
      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>❓ إرسال سؤال لـ {questionUser?.email?.split("@")[0]}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">سيصل السؤال للمستخدم في chat ويقدر يرد عليك مباشرة</p>
            <textarea
              className="w-full border rounded-xl p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="مثال: واش تريد تجدد باقتك؟"
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionDialogOpen(false)}>إلغاء</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={sendQuestion} disabled={!questionText.trim()}>
              إرسال السؤال ❓
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== MESSAGE DIALOG ===== */}
      <Dialog open={msgDialogOpen} onOpenChange={setMsgDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              💬 {msgAll ? "رسالة لجميع المستخدمين" : `رسالة لـ ${msgUser?.email || ""}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {msgAll && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                <p className="text-xs text-orange-700 font-bold">⚠️ ستُرسل هاد الرسالة لـ {users.length} مستخدم</p>
              </div>
            )}
            <textarea
              className="w-full border rounded-xl p-3 text-sm resize-none h-28 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="اكتب رسالتك هنا..."
              value={msgText}
              onChange={e => setMsgText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMsgDialogOpen(false)}>إلغاء</Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handleSendMessage} disabled={!msgText.trim()}>
              إرسال 💬
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DELETE DIALOG ===== */}
      <Dialog open={deleteDialogOpen} onOpenChange={(o) => { setDeleteDialogOpen(o); setDeleteConfirmText(""); }}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle className="text-destructive">⚠️ حذف المستخدم نهائياً</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
              <p className="text-sm font-bold text-red-700">سيتم حذف كل بيانات هذا المستخدم:</p>
              <p className="text-xs text-red-600">• الحساب والرصيد والأرباح</p>
              <p className="text-xs text-red-600">• جميع الشحنات والسحوبات</p>
              <p className="text-xs text-red-600">• المحادثات والإشعارات</p>
              <p className="text-xs text-red-600">• لا يمكن التراجع عن هذا الإجراء</p>
            </div>
            <p className="text-sm text-muted-foreground">
              اكتب <strong className="text-destructive font-mono">CONFIRM</strong> للتأكيد على حذف{" "}
              <strong className="text-destructive">{userToDelete?.email || userToDelete?.user_id.slice(0, 8).toUpperCase()}</strong>
            </p>
            <Input
              placeholder="اكتب CONFIRM"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              className="font-mono text-center tracking-widest border-red-300 focus:border-red-500"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeleteConfirmText(""); }}>إلغاء</Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleteConfirmText !== "CONFIRM"}
            >
              حذف نهائياً 🗑️
            </Button>
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
              <div className="bg-red-50 rounded-2xl p-4 text-center border border-red-100">
                <p className="text-xs text-red-400 mb-1">المبلغ المطلوب سحبه</p>
                <p className="text-4xl font-bold text-red-500">{selectedWithdraw.amount}</p>
                <p className="text-sm text-red-400 mt-1">USDT</p>
                <div className="mt-2 pt-2 border-t border-red-100">
                  <p className="text-xs text-red-400">إجمالي كل سحباته المقبولة: <span className="font-bold text-red-600">{withdrawals.filter(x => x.user_id === selectedWithdraw.user_id && x.status === "confirmed").reduce((s, x) => s + Number(x.amount), 0).toFixed(2)} $</span></p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Account</p>
                  <p className="text-sm font-bold font-mono">{selectedWithdraw.user_id.slice(0, 8).toUpperCase()}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">الطريقة</p>
                  <p className="text-sm font-bold">{selectedWithdraw.method}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">التاريخ والوقت</p>
                  <p className="text-sm font-bold">{new Date(selectedWithdraw.created_at).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">عنوان المحفظة</p>
                  <p className="text-xs font-mono font-bold text-blue-700 break-all bg-blue-50 px-2 py-1.5 rounded-lg mt-1">
                    {selectedWithdraw.wallet_address || "—"}
                  </p>
                </div>
              </div>

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
                            <p className="text-xs text-muted-foreground">{new Date(pw.created_at).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{pw.method}</span>
                          {pw.status === "confirmed" && <Badge className="bg-green-100 text-green-700 border-0 text-xs">✅ مقبول</Badge>}
                          {pw.status === "pending" && <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">⏳ انتظار</Badge>}
                          {pw.status === "rejected" && <Badge className="bg-red-100 text-red-700 border-0 text-xs">❌ مرفوض</Badge>}
                          {pw.status === "cancelled" && <Badge className="bg-gray-100 text-gray-500 border-0 text-xs">↩️ ملغي</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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