import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft, XCircle } from "lucide-react";

const AMOUNTS = [10, 30, 70, 140, 300, 600, 1400, 3500, 6000, 8000, 35000, 70000];
const FEE = 0.8;
const METHODS = ["TRC20-USDT", "BEP20-USDT", "BEP20-USDC"];

const PACK_PRICE: Record<string, number> = {
  "Small shop": 92, "Medium shop": 320, "Large shop": 700, "Mega shop": 1000, "VIP": 1500,
};

const Withdraw = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [packLevel, setPackLevel] = useState("Small shop");
  const [selectedMethod, setSelectedMethod] = useState("TRC20-USDT");
  const [selectedAmount, setSelectedAmount] = useState(10);
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [totalProfit, setTotalProfit] = useState(0);
  const [historyWithdrawals, setHistoryWithdrawals] = useState<any[]>([]);
  const [cancelling, setCancelling] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [zoomedImg, setZoomedImg] = useState<string | null>(null);
  const [windowOpen, setWindowOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [nextOpen, setNextOpen] = useState("");

  useEffect(() => {
    const checkWindow = async () => {
      const { data: settings } = await supabase
        .from("withdrawal_settings").select("*").eq("id", 1).single();
      if (!settings) return;

      if (settings.is_open && settings.opened_at) {
        const openedAt = new Date(settings.opened_at);
        const windowMs = (settings.window_minutes || 150) * 60 * 1000;
        const closeAt = new Date(openedAt.getTime() + windowMs);
        const now = new Date();

        if (now < closeAt) {
          setWindowOpen(true);
          // Countdown timer
          const updateCountdown = () => {
            const remaining = closeAt.getTime() - Date.now();
            if (remaining <= 0) { setWindowOpen(false); setTimeRemaining(""); return; }
            const h = Math.floor(remaining / 3600000);
            const m = Math.floor((remaining % 3600000) / 60000);
            const s = Math.floor((remaining % 60000) / 1000);
            setTimeRemaining(`${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
          };
          updateCountdown();
          const timer = setInterval(updateCountdown, 1000);
          return () => clearInterval(timer);
        } else {
          setWindowOpen(false);
          // Calculate next open (48h from close)
          const nextOpenAt = new Date(closeAt.getTime() + 48 * 3600000);
          setNextOpen(nextOpenAt.toLocaleString("ar"));
        }
      } else {
        setWindowOpen(false);
        if (settings.opened_at) {
          const openedAt = new Date(settings.opened_at);
          const windowMs = (settings.window_minutes || 150) * 60 * 1000;
          const closeAt = new Date(openedAt.getTime() + windowMs);
          const nextOpenAt = new Date(closeAt.getTime() + 48 * 3600000);
          setNextOpen(nextOpenAt.toLocaleString("ar"));
        }
      }
    };
    checkWindow();
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setUserId(user.id);

      const { data: store } = await supabase.from("user_stores")
        .select("balance, total_topup, total_profit, store_level, is_blocked, blocked_until").eq("user_id", user.id).maybeSingle();
      if (store) {
        const dbBalance = Number(store.balance || 0);
        const calcBalance = Number(store.total_profit || 0);
        setBalance(calcBalance);
        setPackLevel(store.store_level || "Small shop");
        setTotalProfit(Number(store.total_profit || 0));
        // Check blocked
        if (store.is_blocked) {
          const blockedUntil = store.blocked_until ? new Date(store.blocked_until) : null;
          if (!blockedUntil || blockedUntil > new Date()) setIsBlocked(true);
        }
      }

      const { data: pending } = await supabase.from("withdrawals").select("*")
        .eq("user_id", user.id).eq("status", "pending")
        .order("created_at", { ascending: false });
      if (pending) setPendingWithdrawals(pending);

      const { data: history } = await supabase.from("withdrawals").select("*")
        .eq("user_id", user.id).in("status", ["confirmed", "rejected", "cancelled"])
        .order("created_at", { ascending: false }).limit(20);
      if (history) setHistoryWithdrawals(history);
    };
    load();
  }, [navigate]);

  const minRequired = PACK_PRICE[packLevel] || 92;
  // Max withdraw = balance (total_profit)
  const maxWithdraw = Math.max(0, balance);



  const handleWithdraw = async () => {
    if (isBlocked) { toast.error("🔒 حسابك محجوب — لا يمكنك السحب"); return; }
    if (!walletAddress.trim()) { toast.error("أدخل عنوان المحفظة"); return; }
    if (selectedAmount < 10) { toast.error("الحد الأدنى 10 USDT"); return; }
    if (maxWithdraw <= 0) { toast.error("ليس لديك رصيد كافٍ للسحب"); return; }
    if (selectedAmount > maxWithdraw) { toast.error(`أقصى مبلغ: ${maxWithdraw.toFixed(2)} USDT`); return; }



    setLoading(true);
    try {
      const { error } = await supabase.from("withdrawals").insert({
        user_id: userId, amount: selectedAmount, method: selectedMethod,
        wallet_address: walletAddress.trim(), status: "pending",
      });
      if (error) throw error;

      await supabase.from("user_stores").update({
        balance: balance - selectedAmount, last_profit_update: new Date().toISOString(),
      }).eq("user_id", userId);

      toast.success(`✅ تم تقديم طلب السحب — ${selectedAmount} USDT`);
      setBalance(prev => prev - selectedAmount);
      setWalletAddress("");

      const { data: pending } = await supabase.from("withdrawals").select("*")
        .eq("user_id", userId).eq("status", "pending")
        .order("created_at", { ascending: false });
      if (pending) setPendingWithdrawals(pending);
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (w: any) => {
    setCancelling(w.id);
    try {
      await supabase.from("withdrawals").update({ status: "cancelled" }).eq("id", w.id);
      const { data: store } = await supabase.from("user_stores").select("balance").eq("user_id", userId).single();
      if (store) {
        await supabase.from("user_stores").update({ balance: Number(store.balance) + Number(w.amount) }).eq("user_id", userId);
        setBalance(Number(store.balance) + Number(w.amount));
      }
      toast.success(`✅ تم الإلغاء — تم إرجاع ${w.amount} USDT`);
      setPendingWithdrawals(prev => prev.filter(x => x.id !== w.id));
      const { data: history } = await supabase.from("withdrawals").select("*")
        .eq("user_id", userId).in("status", ["confirmed", "rejected", "cancelled"])
        .order("created_at", { ascending: false }).limit(20);
      if (history) setHistoryWithdrawals(history);
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setCancelling("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="ltr">

      {/* Image zoom overlay */}
      {zoomedImg && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setZoomedImg(null)}>
          <img src={zoomedImg} className="max-w-full max-h-full rounded-2xl shadow-2xl" />
          <p className="absolute bottom-6 text-white/60 text-xs">اضغط في أي مكان للإغلاق</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white flex items-center px-4 py-4 pt-12 border-b">
        <button onClick={() => navigate(-1)} className="mr-3">
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-800 flex-1 text-center">Withdraw</h1>
        <span className="w-9" />
      </div>

      {/* Balance card */}
      <div className="mx-4 mt-4 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl p-5 text-white shadow-lg">
        <p className="text-xs text-white/60 mb-1 uppercase tracking-wider">Available Balance</p>
        <p className="text-4xl font-bold">{balance.toFixed(2)} <span className="text-xl font-normal text-white/70">USDT</span></p>
        <div className="mt-3 h-px bg-white/10" />
        <div className="mt-3 flex justify-center text-xs text-white/50">
          <span>Max withdraw: <span className="text-white/80 font-bold">{maxWithdraw.toFixed(2)} USDT</span></span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex mx-4 mt-4 bg-white rounded-2xl p-1 shadow-sm">
        <button onClick={() => setActiveTab("new")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "new" ? "bg-blue-500 text-white shadow-sm" : "text-gray-400"}`}>
          New Withdrawal
        </button>
        <button onClick={() => setActiveTab("history")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all relative ${activeTab === "history" ? "bg-blue-500 text-white shadow-sm" : "text-gray-400"}`}>
          History
          {historyWithdrawals.length > 0 && activeTab !== "history" && (
            <span className="absolute top-1.5 right-3 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>
      </div>

      <div className="px-4 pb-10 mt-3 space-y-3">

        {/* Pending — always visible */}
        {pendingWithdrawals.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">⏳ Pending ({pendingWithdrawals.length})</p>
            {pendingWithdrawals.map((w: any) => (
              <div key={w.id} className="bg-white rounded-xl p-3 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-800">{w.amount} <span className="text-xs text-gray-400">USDT</span></p>
                    <p className="text-xs text-gray-400">{w.method} · {new Date(w.created_at).toLocaleDateString()}</p>
                    <p className="text-xs font-mono text-gray-300 truncate max-w-[180px]">{w.wallet_address}</p>
                  </div>
                  <button onClick={() => handleCancel(w)} disabled={cancelling === w.id}
                    className="bg-red-500 text-white text-xs font-bold px-3 py-2 rounded-xl disabled:opacity-50 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {cancelling === w.id ? "..." : "Cancel"}
                  </button>
                </div>
                {/* Screenshot thumbnail */}
                {w.screenshot_url && (
                  <div className="flex items-center gap-2">
                    <img
                      src={w.screenshot_url}
                      className="w-14 h-14 object-cover rounded-xl cursor-pointer border-2 border-green-200 hover:opacity-80"
                      onClick={() => setZoomedImg(w.screenshot_url)}
                    />
                    <p className="text-xs text-green-600 font-bold">✅ إثبات الإرسال — اضغط للتكبير</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* New Withdrawal Form */}
        {activeTab === "new" && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">

            {/* Blocked banner */}
            {isBlocked && (
              <div className="bg-red-50 border border-red-300 rounded-2xl p-4 text-center">
                <p className="text-red-700 font-bold text-sm">🔒 حسابك محجوب</p>
                <p className="text-red-500 text-xs mt-1">لا يمكنك السحب — تواصل مع الدعم</p>
              </div>
            )}

          {/* Window status banner */}
            {windowOpen ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                <p className="text-green-700 font-bold text-sm">✅ نافذة السحب مفتوحة الآن</p>
                <p className="text-green-600 text-xs mt-1">الوقت المتبقي:</p>
                <p className="text-3xl font-bold text-green-700 tabular-nums mt-1">{timeRemaining}</p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                <p className="text-red-700 font-bold text-sm">🔒 نافذة السحب مغلقة حالياً</p>
                {nextOpen && <p className="text-red-500 text-xs mt-1">الفتح القادم المتوقع: <span className="font-bold">{nextOpen}</span></p>}
                <p className="text-red-400 text-xs mt-1">تُفتح أيام الاثنين والجمعة طوال اليوم</p>
              </div>
            )}
            {/* Method */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Network</p>
              <div className="flex gap-2 flex-wrap">
                {METHODS.map(m => (
                  <button key={m} onClick={() => setSelectedMethod(m)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${selectedMethod === m ? "border-blue-500 bg-blue-500 text-white" : "border-gray-100 text-gray-400 hover:border-gray-200"}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Wallet */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Wallet Address</p>
              <input type="text" placeholder={selectedMethod === "TRC20-USDT" ? "T..." : "0x..."}
                value={walletAddress} onChange={e => setWalletAddress(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-blue-400 transition-colors" />
            </div>

            {/* Amount */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Amount (USDT)</p>
              <div className="grid grid-cols-4 gap-2">
                {AMOUNTS.map(a => (
                  <button key={a} onClick={() => setSelectedAmount(a)}
                    className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                      selectedAmount === a ? "bg-blue-500 text-white shadow-md" :
                      a > maxWithdraw ? "bg-gray-50 text-gray-200 cursor-not-allowed" :
                      "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}>
                    {a >= 1000 ? `${a / 1000}K` : a}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">Fee: {FEE} USDT · Receive: <span className="font-bold text-gray-600">{(selectedAmount - FEE).toFixed(2)} USDT</span></p>
            </div>

            {/* Warning */}
  

          {selectedAmount > maxWithdraw && maxWithdraw > 0 && (
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
                <p className="text-xs text-orange-600 font-bold">الحد الأقصى للسحب: {maxWithdraw.toFixed(2)} USDT</p>
              </div>
            )}

            {maxWithdraw <= 0 && balance <= 0 && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                <p className="text-xs text-red-600 font-bold">❌ ليس لديك رصيد كافٍ للسحب</p>
              </div>
            )}

            {/* Submit */}
            <button onClick={handleWithdraw}
              disabled={loading || selectedAmount > maxWithdraw || maxWithdraw <= 0 || !walletAddress.trim() || !windowOpen || isBlocked}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-2xl text-base disabled:opacity-40 transition-all shadow-lg shadow-blue-100">
              {loading ? "Processing..." : !windowOpen ? "🔒 نافذة السحب مغلقة" : `Withdraw ${selectedAmount} USDT`}
            </button>
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            {historyWithdrawals.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No withdrawal history yet</p>
            ) : (
              historyWithdrawals.map((w: any) => (
                <div key={w.id} className="border border-gray-100 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-800">{w.amount} <span className="text-xs text-gray-400">USDT</span></p>
                      <p className="text-xs text-gray-400">{w.method} · {new Date(w.created_at).toLocaleString()}</p>
                    </div>
                    {w.status === "confirmed" && <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-1 rounded-lg">✅ Done</span>}
                    {w.status === "rejected" && <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-1 rounded-lg">❌ Rejected</span>}
                    {w.status === "cancelled" && <span className="text-xs bg-gray-100 text-gray-500 font-bold px-2 py-1 rounded-lg">↩️ Cancelled</span>}
                  </div>
                  {/* Thumbnail */}
                  {w.screenshot_url && (
                    <div className="flex items-center gap-2">
                      <img
                        src={w.screenshot_url}
                        className="w-14 h-14 object-cover rounded-xl cursor-pointer border border-gray-100 hover:opacity-80 transition-opacity"
                        onClick={() => setZoomedImg(w.screenshot_url)}
                      />
                      <p className="text-xs text-gray-400">إثبات الإرسال — اضغط للتكبير</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Withdraw;