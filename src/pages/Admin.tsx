import { motion } from "framer-motion";
import { Store, Gem, TrendingUp, Star, Crown, Rocket, ArrowUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const storePlans = [
  {
    id: "small", nameAr: "متجر صغير", level: "LV1", icon: Store,
    color: "from-orange-400 to-orange-500", lightBg: "bg-orange-50",
    iconColor: "text-orange-500", borderColor: "border-orange-200",
    price: 92, products: 5, commission: 10,
    daily: { min: 9.5, max: 11.5 }, monthly: { min: 285, max: 345 }, yearly: { min: 3420, max: 4140 },
  },
  {
    id: "medium", nameAr: "متجر متوسط", level: "LV2", icon: Gem,
    color: "from-blue-500 to-blue-600", lightBg: "bg-blue-50",
    iconColor: "text-blue-500", borderColor: "border-blue-200",
    price: 320, products: 10, commission: 12,
    daily: { min: 32, max: 39 }, monthly: { min: 960, max: 1170 }, yearly: { min: 11520, max: 14040 },
  },
  {
    id: "large", nameAr: "متجر كبير", level: "LV3", icon: TrendingUp,
    color: "from-violet-500 to-violet-600", lightBg: "bg-violet-50",
    iconColor: "text-violet-500", borderColor: "border-violet-200",
    price: 700, products: 15, commission: 15,
    daily: { min: 75, max: 92 }, monthly: { min: 2250, max: 2760 }, yearly: { min: 27000, max: 33120 },
  },
  {
    id: "xl", nameAr: "متجر XL", level: "LV4", icon: Star,
    color: "from-pink-500 to-rose-500", lightBg: "bg-pink-50",
    iconColor: "text-pink-500", borderColor: "border-pink-200",
    price: 1000, products: 20, commission: 18,
    daily: { min: 110, max: 135 }, monthly: { min: 3300, max: 4050 }, yearly: { min: 39600, max: 48600 },
  },
  {
    id: "premium", nameAr: "متجر بريميوم", level: "LV5", icon: Crown,
    color: "from-amber-500 to-yellow-500", lightBg: "bg-amber-50",
    iconColor: "text-amber-500", borderColor: "border-amber-200",
    price: 1500, products: 30, commission: 20,
    daily: { min: 180, max: 220 }, monthly: { min: 5400, max: 6600 }, yearly: { min: 64800, max: 79200 },
  },
  {
    id: "investor", nameAr: "متجر المستثمر", level: "LV6", icon: Rocket,
    color: "from-emerald-500 to-teal-600", lightBg: "bg-emerald-50",
    iconColor: "text-emerald-600", borderColor: "border-emerald-200",
    price: 2000, products: 50, commission: 25,
    daily: { min: 300, max: 380 }, monthly: { min: 9000, max: 11400 }, yearly: { min: 108000, max: 136800 },
  },
];

const PACK_NAME_MAP: Record<string, string> = {
  "small": "Small shop", "medium": "Medium shop", "large": "Large shop",
  "xl": "Mega shop", "premium": "VIP", "investor": "VIP",
};

const StoreLevels = () => {
  const navigate = useNavigate();
  const [currentPack, setCurrentPack] = useState("");
  const [currentPrice, setCurrentPrice] = useState(0);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: store } = await supabase.from("user_stores").select("store_level").eq("user_id", user.id).maybeSingle();
      if (store) {
        setCurrentPack(store.store_level);
        const plan = storePlans.find(p => PACK_NAME_MAP[p.id] === store.store_level);
        if (plan) setCurrentPrice(plan.price);
      }
    };
    load();
  }, []);

  const handleUpgrade = async (plan: typeof storePlans[0]) => {
    const packName = PACK_NAME_MAP[plan.id];
    
    // If no current pack → go to topup
    if (!currentPack) {
      navigate(`/topup?amount=${plan.price}&plan=${encodeURIComponent(plan.nameAr)}`);
      return;
    }

    // If same pack → already active
    if (packName === currentPack) {
      toast.info("هذه هي باقتك الحالية");
      return;
    }

    // If lower pack → can't downgrade
    if (plan.price <= currentPrice) {
      toast.error("لا يمكن الترقية لباقة أقل");
      return;
    }

    // Upgrade request
    const diff = plan.price - currentPrice;
    setLoading(true);
    try {
      const { error } = await supabase.from("pack_upgrades").insert({
        user_id: userId,
        current_pack: currentPack,
        requested_pack: packName,
        amount_to_pay: diff,
        status: "pending",
      });
      if (error) throw error;
      toast.success(`✅ تم إرسال طلب الترقية! ستدفع $${diff} (الفرق فقط)`);
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] pb-24" dir="rtl">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white pt-16 pb-5 px-4">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-xl font-bold tracking-wide">مستوى المتجر</h1>
          <p className="text-emerald-100 text-sm mt-1">اختر مستواك وابدأ رحلة الربح اليوم</p>
          {currentPack && (
            <div className="mt-2 inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
              باقتك الحالية: {currentPack}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100 mb-2">
          <p className="text-xs text-gray-600 text-center leading-relaxed">
            💡 <strong>نموذج ربحنا المزدوج:</strong> تكسب من{" "}
            <span className="text-emerald-600 font-bold">عمولة المنتجات</span> اليومية +{" "}
            <span className="text-blue-600 font-bold">مكافآت الفريق</span> عند دعوة أصدقائك
          </p>
        </div>
      </div>

      <div className="px-4 py-3 space-y-4 max-w-md mx-auto">
        {storePlans.map((plan, i) => {
          const Icon = plan.icon;
          const packName = PACK_NAME_MAP[plan.id];
          const isCurrentPack = packName === currentPack;
          const isUpgrade = currentPack && plan.price > currentPrice;
          const diff = plan.price - currentPrice;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className={`bg-white rounded-2xl shadow-md overflow-hidden border ${plan.borderColor} ${isCurrentPack ? "ring-2 ring-emerald-500" : ""}`}
            >
              <div className={`bg-gradient-to-r ${plan.color} px-4 py-3 flex items-center justify-between`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-bold text-white text-base">{plan.nameAr}</p>
                  {isCurrentPack && <span className="bg-white text-emerald-600 text-xs font-bold px-2 py-0.5 rounded-full">✅ باقتك</span>}
                </div>
                <span className="bg-white/25 text-white text-xs font-bold px-2.5 py-1 rounded-full">{plan.level}</span>
              </div>

              <div className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className={`${plan.lightBg} rounded-xl p-2.5 text-center`}>
                    <p className="text-[10px] text-gray-500 mb-0.5">المنتجات</p>
                    <p className={`text-lg font-bold ${plan.iconColor}`}>{plan.products}</p>
                  </div>
                  <div className={`${plan.lightBg} rounded-xl p-2.5 text-center`}>
                    <p className="text-[10px] text-gray-500 mb-0.5">العمولة</p>
                    <p className={`text-lg font-bold ${plan.iconColor}`}>{plan.commission}%</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                    <p className="text-[10px] text-gray-500 mb-0.5">السعر</p>
                    <p className="text-base font-bold text-gray-800">${plan.price}</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-3 border border-emerald-100">
                  <p className="text-[11px] text-emerald-700 font-bold mb-2 text-center">📊 الدخل المتوقع بـ USDT</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">💰 يومياً</span>
                      <span className="text-sm font-bold text-emerald-600">{plan.daily.min} – {plan.daily.max} USDT</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">📅 شهرياً</span>
                      <span className="text-sm font-bold text-emerald-600">{plan.monthly.min} – {plan.monthly.max} USDT</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-emerald-100 pt-2">
                      <span className="text-xs text-gray-500">🏆 سنوياً</span>
                      <span className="text-base font-bold text-teal-700">{plan.yearly.min.toLocaleString()} – {plan.yearly.max.toLocaleString()} USDT</span>
                    </div>
                  </div>
                </div>

                {isCurrentPack ? (
                  <div className="w-full py-3.5 rounded-xl bg-emerald-100 text-emerald-700 font-bold text-base text-center">
                    ✅ باقتك الحالية
                  </div>
                ) : isUpgrade ? (
                  <button
                    onClick={() => handleUpgrade(plan)}
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 active:scale-[0.98] transition-all text-white font-bold text-base shadow-lg flex items-center justify-center gap-2"
                  >
                    <ArrowUp className="w-5 h-5" />
                    ترقية — ادفع ${diff} فقط
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(`/topup?amount=${plan.price}&plan=${encodeURIComponent(plan.nameAr)}`)}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98] transition-all text-white font-bold text-base shadow-lg shadow-emerald-200"
                  >
                    قم بالتفعيل الآن — ${plan.price} USDT 🚀
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="max-w-md mx-auto px-4 pb-2">
        <p className="text-center text-xs text-gray-400">
          * الأرقام تقديرية بناءً على أداء السوق. النتائج الفعلية قد تتفاوت.
        </p>
      </div>
    </div>
  );
};

export default StoreLevels;