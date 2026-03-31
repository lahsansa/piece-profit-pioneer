import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft, Clock, XCircle } from "lucide-react";

const AMOUNTS = [10, 30, 70, 140, 300, 600, 1400, 3500, 6000, 8000, 35000, 70000];
const FEE = 0.8;
const METHODS = ["TRC20-USDT", "BEP20-USDT", "BEP20-USDC"];

const Withdraw = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState("TRC20-USDT");
  const [selectedAmount, setSelectedAmount] = useState(10);
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [cancelling, setCancelling] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setUserId(user.id);
      const { data: store } = await supabase.from("user_stores").select("balance").eq("user_id", user.id).maybeSingle();
      if (store) setBalance(Number(store.balance));
      // Load pending withdrawals
      const { data: withdraws } = await supabase.from("withdrawals").select("*").eq("user_id", user.id).eq("status", "pending").order("created_at", { ascending: false });
      if (withdraws) setPendingWithdrawals(withdraws);
    };
    load();
  }, [navigate]);

  const handleWithdraw = async () => {
    if (!walletAddress.trim()) { toast.error("أدخل عنوان المحفظة"); return; }
    if (selectedAmount > balance) { toast.error("الرصيد غير كافٍ"); return; }
    if (selectedAmount < 10) { toast.error("الحد الأدنى للسحب 10 USDT"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from("withdrawals").insert({
        user_id: userId,
        amount: selectedAmount,
        method: selectedMethod,
        wallet_address: walletAddress.trim(),
        status: "pending",
      });
      if (error) throw error;

      await supabase.from("user_stores").update({ balance: balance - selectedAmount }).eq("user_id", userId);
      toast.success(`✅ تم تقديم طلب السحب — ${selectedAmount} USDT`);
      setBalance(prev => prev - selectedAmount);
      setWalletAddress("");

      // Refresh pending withdrawals
      const { data: withdraws } = await supabase.from("withdrawals").select("*").eq("user_id", userId).eq("status", "pending").order("created_at", { ascending: false });
      if (withdraws) setPendingWithdrawals(withdraws);
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (w: any) => {
    setCancelling(w.id);
    try {
      // Update status to cancelled
      await supabase.from("withdrawals").update({ status: "cancelled" }).eq("id", w.id);
      // Refund balance
      const { data: store } = await supabase.from("user_stores").select("balance").eq("user_id", userId).single();
      if (store) {
        const refund = Number(w.amount);
        await supabase.from("user_stores").update({ balance: Number(store.balance) + refund }).eq("user_id", userId);
        setBalance(Number(store.balance) + refund);
      }
      toast.success(`✅ تم إلغاء طلب السحب — تم إرجاع ${w.amount} USDT`);
      setPendingWithdrawals(prev => prev.filter((x: any) => x.id !== w.id));
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setCancelling("");
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]" dir="ltr">
      {/* Header */}
      <div className="bg-white flex items-center justify-between px-4 py-4 pt-12">
        <button onClick={() => navigate(-1)} className="p-1">
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">Withdraw</h1>
        <span className="w-10" />
      </div>

      <div className="space-y-3 p-4">
        {/* Balance */}
        <div className="bg-[#E8B84B] rounded-2xl p-5">
          <p className="text-sm text-white/80 mb-1">Available Balance</p>
          <p className="text-4xl font-bold text-white">{balance.toFixed(2)} <span className="text-xl">USDT</span></p>
        </div>

        {/* Pending withdrawals */}
        {pendingWithdrawals.length > 0 && (
          <div className="bg-white rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" /> Pending Withdrawals
            </p>
            {pendingWithdrawals.map((w: any) => (
              <div key={w.id} className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-orange-600">{w.amount} USDT</p>
                  <p className="text-xs text-gray-500">{w.method}</p>
                  <p className="text-xs font-mono text-gray-400 truncate max-w-[180px]">{w.wallet_address}</p>
                  <p className="text-xs text-gray-400">{new Date(w.created_at).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => handleCancel(w)}
                  disabled={cancelling === w.id}
                  className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  {cancelling === w.id ? "..." : "Cancel"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-2xl p-4 space-y-4">
          {/* Method */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Withdrawal method</p>
            <div className="flex gap-2 flex-wrap">
              {METHODS.map((m) => (
                <button key={m} onClick={() => setSelectedMethod(m)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedMethod === m ? "bg-[#4A90D9] text-white" : "bg-gray-100 text-gray-500"}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Wallet Address */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Wallet Address</p>
            <input
              type="text"
              placeholder="Enter your wallet address..."
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">
              {selectedMethod === "TRC20-USDT" ? "TRC20 address starts with T..." : "BEP20 address starts with 0x..."}
            </p>
          </div>

          {/* Amount */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Amount</p>
            <div className="grid grid-cols-4 gap-2">
              {AMOUNTS.map((a) => (
                <button key={a} onClick={() => setSelectedAmount(a)}
                  className={`py-3 rounded-xl text-sm font-bold transition-all ${selectedAmount === a ? "bg-[#4A90D9] text-white" : "bg-gray-100 text-gray-500"}`}>
                  {a.toLocaleString()}
                </button>
              ))}
            </div>
            <p className="text-sm text-red-500 font-medium mt-2">fee {FEE} USDT</p>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount</span>
              <span className="font-bold">{selectedAmount} USDT</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Fee</span>
              <span className="text-red-500 font-bold">{FEE} USDT</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-1 mt-1">
              <span className="text-gray-500">You receive</span>
              <span className="font-bold text-green-600">{(selectedAmount - FEE).toFixed(2)} USDT</span>
            </div>
            {walletAddress && (
              <div className="flex justify-between text-sm border-t pt-1 mt-1">
                <span className="text-gray-500">To</span>
                <span className="font-mono text-xs text-gray-700 truncate max-w-[180px]">{walletAddress}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleWithdraw}
            disabled={loading || selectedAmount > balance}
            className="w-full bg-[#4A90D9] text-white font-bold py-4 rounded-2xl text-base disabled:opacity-50"
          >
            {loading ? "جاري..." : `Confirm Withdrawal — ${selectedAmount} USDT`}
          </button>

          {selectedAmount > balance && (
            <p className="text-center text-red-500 text-sm">❌ الرصيد غير كافٍ</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Withdraw;