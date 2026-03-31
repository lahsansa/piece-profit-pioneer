import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

const AMOUNTS = [10, 30, 70, 140, 300, 600, 1400, 3500, 6000, 8000, 35000, 70000];
const FEE = 0.8;
const METHODS = ["TRC20-USDT", "BEP20-USDT", "BEP20-USDC"];

const Withdraw = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState("TRC20-USDT");
  const [selectedAmount, setSelectedAmount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setUserId(user.id);
      const { data: store } = await supabase.from("user_stores").select("balance").eq("user_id", user.id).maybeSingle();
      if (store) setBalance(Number(store.balance));
    };
    load();
  }, [navigate]);

  const handleWithdraw = async () => {
    if (selectedAmount > balance) { toast.error("الرصيد غير كافٍ"); return; }
    if (selectedAmount < 10) { toast.error("الحد الأدنى للسحب 10 USDT"); return; }
    setLoading(true);
    try {
      // Insert withdrawal request
      const { error } = await supabase.from("withdrawals").insert({
        user_id: userId,
        amount: selectedAmount,
        method: selectedMethod,
        status: "pending",
      });
      if (error) throw error;

      // Deduct balance
      await supabase.from("user_stores").update({
        balance: balance - selectedAmount,
      }).eq("user_id", userId);

      toast.success(`✅ تم تقديم طلب السحب — ${selectedAmount} USDT`);
      setBalance(prev => prev - selectedAmount);
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setLoading(false);
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
        <span className="text-sm text-gray-400 w-10" />
      </div>

      <div className="space-y-3 p-4">
        {/* Balance */}
        <div className="bg-[#E8B84B] rounded-2xl p-5">
          <p className="text-sm text-white/80 mb-1">Available Balance</p>
          <p className="text-4xl font-bold text-white">{balance.toFixed(2)} <span className="text-xl">USDT</span></p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl p-4 space-y-4">

          {/* Method */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Withdrawal method</p>
            <div className="flex gap-2 flex-wrap">
              {METHODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedMethod(m)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedMethod === m ? "bg-[#4A90D9] text-white" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Amount</p>
            <div className="grid grid-cols-4 gap-2">
              {AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => setSelectedAmount(a)}
                  className={`py-3 rounded-xl text-sm font-bold transition-all ${
                    selectedAmount === a ? "bg-[#4A90D9] text-white" : "bg-gray-100 text-gray-500"
                  }`}
                >
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
          </div>

          {/* Submit */}
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