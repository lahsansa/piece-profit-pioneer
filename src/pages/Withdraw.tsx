import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft, Check } from "lucide-react";

const AMOUNTS = [10, 30, 70, 140, 300, 600, 1400, 3500, 6000, 8000, 35000, 70000];
const FEE = 0.8;
const METHODS = ["TRC20-USDT", "BEP20-USDT", "BEP20-USDC"];

const Withdraw = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState("TRC20-USDT");
  const [selectedAmount, setSelectedAmount] = useState(10);
  const [password, setPassword] = useState("");
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
    if (!password) { toast.error("أدخل كلمة مرور الدفع"); return; }
    if (selectedAmount > balance) { toast.error("الرصيد غير كافٍ"); return; }
    if (selectedAmount < 10) { toast.error("الحد الأدنى للسحب 10 USDT"); return; }
    setLoading(true);
    try {
      // Deduct balance
      await supabase.from("user_stores").update({
        balance: balance - selectedAmount,
      }).eq("user_id", userId);
      toast.success(`✅ تم تقديم طلب السحب — ${selectedAmount} USDT`);
      setBalance(prev => prev - selectedAmount);
      setPassword("");
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
        <button className="text-sm text-gray-500">Record</button>
      </div>

      <div className="space-y-3 p-4">
        {/* Income wallet */}
        <div className="bg-white rounded-2xl p-4">
          <p className="text-sm text-gray-400 mb-1">Income wallet</p>
          <div className="flex items-center justify-between">
            <p className="text-3xl font-bold text-gray-900">0.00</p>
          </div>
        </div>

        {/* Recharge wallet */}
        <div className="bg-white rounded-2xl p-4">
          <p className="text-sm text-gray-400 mb-1">Recharge wallet</p>
          <p className="text-3xl font-bold text-gray-900">0.00</p>
        </div>

        {/* Main wallet */}
        <div className="bg-[#E8B84B] rounded-2xl p-4">
          <p className="text-sm text-white/80 mb-1">Main wallet</p>
          <div className="flex items-center justify-between">
            <p className="text-3xl font-bold text-white">{balance.toFixed(2)}</p>
            <button className="bg-[#4A90D9] text-white text-sm font-semibold px-4 py-2 rounded-full">
              Merge wallet
            </button>
          </div>
        </div>

        {/* Withdrawal method */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">select withdrawal method</p>
          <div className="flex gap-2 flex-wrap">
            {METHODS.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMethod(m)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedMethod === m
                    ? "bg-[#4A90D9] text-white"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Amount buttons */}
          <p className="text-sm font-semibold text-gray-700 mt-2">amount</p>
          <div className="grid grid-cols-4 gap-2">
            {AMOUNTS.map((a) => (
              <button
                key={a}
                onClick={() => setSelectedAmount(a)}
                className={`py-3 rounded-xl text-sm font-bold transition-all ${
                  selectedAmount === a
                    ? "bg-[#4A90D9] text-white"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {a.toLocaleString()}
              </button>
            ))}
          </div>

          {/* Fee */}
          <p className="text-sm text-red-500 font-medium">fee {FEE}</p>

          {/* Payment password */}
          <p className="text-sm font-semibold text-gray-700">payment password</p>
          <input
            type="password"
            placeholder="Please enter the payment password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400"
          />

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
            disabled={loading}
            className="w-full bg-[#4A90D9] text-white font-bold py-4 rounded-2xl text-base mt-2 disabled:opacity-60"
          >
            {loading ? "جاري..." : "Confirm Withdrawal"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Withdraw;