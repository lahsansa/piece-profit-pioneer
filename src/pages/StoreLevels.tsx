import { motion } from "framer-motion";
import { Store, Gem, TrendingUp, Star, Crown, Rocket, Zap, ArrowUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const storePlans = [
  {
    id: "pack45", nameAr: "باقة $45", level: "LV1", icon: Store,
    color: "from-gray-400 to-gray-500", lightBg: "bg-gray-50",
    iconColor: "text-gray-500", borderColor: "border-gray-200",
    price: 45, products: 3, commission: 14,
    daily: 1.2, monthly: 36, yearly: 400, roi: 42,
  },
  {
    id: "pack99", nameAr: "باقة $99", level: "LV2", icon: Zap,
    color: "from-orange-400 to-orange-500", lightBg: "bg-orange-50",
    iconColor: "text-orange-500", borderColor: "border-orange-200",
    price: 99, products: 5, commission: 15,
    daily: 2.8, monthly: 84, yearly: 920, roi: 40,
  },
  {
    id: "pack350", nameAr: "باقة $350", level: "LV3", icon: Gem,
    color: "from-blue-500 to-blue-600", lightBg: "bg-blue-50",
    iconColor: "text-blue-500", borderColor: "border-blue-200",
    price: 350, products: 10, commission: 16,
    daily: 11, monthly: 330, yearly: 3600, roi: 36,
  },
  {
    id: "pack750", nameAr: "باقة $750", level: "LV4", icon: TrendingUp,
    color: "from-violet-500 to-violet-600", lightBg: "bg-violet-50",
    iconColor: "text-violet-500", borderColor: "border-violet-200",
    price: 750, products: 15, commission: 17,
    daily: 24, monthly: 720, yearly: 7800, roi: 35,
  },
  {
    id: "pack1100", nameAr: "باقة $1100", level: "LV5", icon: Star,
    color: "from-pink-500 to-rose-500", lightBg: "bg-pink-50",
    iconColor: "text-pink-500", borderColor: "border-pink-200",
    price: 1100, products: 20, commission: 18,
    daily: 36, monthly: 1080, yearly: 11800, roi: 33,
  },
  {
    id: "pack1650", nameAr: "باقة $1650", level: "LV6", icon: Crown,
    color: "from-amber-500 to-yellow-500", lightBg: "bg-amber-50",
    iconColor: "text-amber-500", borderColor: "border-amber-200",
    price: 1650, products: 30, commission: 19,
    daily: 55, monthly: 1650, yearly: 18000, roi: 32,
  },
  {
    id: "pack2200", nameAr: "باقة $2200", level: "LV7", icon: Rocket,
    color: "from-emerald-500 to-teal-600", lightBg: "bg-emerald-50",
    iconColor: "text-emerald-600", borderColor: "border-emerald-200",
    price: 2200, products: 50, commission: 20,
    daily: 78, monthly: 2340, yearly: 26000, roi: 30,
  },
];

const StoreLevels = () => {
  const navigate = useNavigate();
  const [currentPrice, setCurrentPrice] = useState(0);
  const [hasPaid, setHasPaid] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: store } = await supabase
        .from("user_stores")
        .select("total_topup")
        .eq("user_id", user.id)
        .maybeSingle();
      if (store && Number(store.total_topup) > 0) {
        setHasPaid(true);
        const paid = Number(store.total_topup);
        // Map old pack prices to new ones
        const oldToNew: Record<number, number> = {
          92: 99, 320: 350, 700: 750, 1000: 1100, 1500: 1650, 2000: 2200,
        };
        const mappedPaid = oldToNew[paid] || paid;
        // Find closest pack price <= mappedPaid
        const matchedPlan = [...storePlans].reverse().find(p => mappedPaid >= p.price);
        if (matchedPlan) setCurrentPrice(matchedPlan.price);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleActivate = (plan: typeof storePlans[0]) => {
    navigate(`/topup?amount=${plan.price}&plan=${encodeURIComponent(plan.nameAr)}`);
  };

  const handleUpgrade = (plan: typeof storePlans[0]) => {
    const diff = plan.price - currentPrice;
    navigate(`/topup?amount=${diff}&plan=${encodeURIComponent(plan.nameAr)}&upgrade=true&to=${encodeURIComponent(plan.nameAr)}`);
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] pb-24" dir="rtl">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white pt-16 pb-5 px-4">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-xl font-bold tracking-wide">مستوى المتجر</h1>
          <p className="text-emerald-100 text-sm mt-1">اختر مستواك وابدأ رحلة الربح اليوم</p>
          {hasPaid && currentPrice > 0 && (
            <div className="mt-2 inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
              باقتك الحالية: ${currentPrice}
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
          const isCurrentPack = hasPaid && currentPrice === plan.price;
          const isUpgrade = hasPaid && plan.price > currentPrice;
          const isLower = hasPaid && plan.price < currentPrice;

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
                  {isCurrentPack && (
                    <span className="bg-white text-emerald-600 text-xs font-bold px-2 py-0.5 rounded-full">✅ باقتك</span>
                  )}
                </div>
                <span className="bg-white/25 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                  {plan.level}
                </span>
              </div>

              <div className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className={`${plan.lightBg} rounded-xl p-2.5 text-center`}>
                    <p className="text-[10px] text-gray-500 mb-0.5">المنتجات</p>
                    <p className={`text-lg font-bold ${plan.iconColor}`}>{plan.products}</p>
                  </div>
                  <div className={`${plan.lightBg} rounded-xl p-2.5 text-center`}>
                    <p className="text-[10px] text-gray-500 mb-0.5">نسبة الربح</p>
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
                      <span className="text-sm font-bold text-emerald-600">{plan.daily} USDT</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">📅 شهرياً</span>
                      <span className="text-sm font-bold text-emerald-600">{plan.monthly} USDT</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">⏱ استرداد رأس المال</span>
                      <span className="text-sm font-bold text-blue-600">{plan.roi} يوم</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">📈 نسبة الربح</span>
                      <span className="text-sm font-bold text-purple-600">{plan.commission}%</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-emerald-100 pt-2">
                      <span className="text-xs text-gray-500">🏆 صافي الربح سنوياً</span>
                      <span className="text-base font-bold text-teal-700">{plan.yearly.toLocaleString()} USDT</span>
                    </div>
                  </div>
                </div>

                {isCurrentPack ? (
                  <div className="w-full py-3.5 rounded-xl bg-emerald-100 text-emerald-700 font-bold text-base text-center">
                    ✅ باقتك الحالية
                  </div>
                ) : (plan.id === "pack45" && hasPaid) ? (
                  <div className="w-full py-3.5 rounded-xl bg-gray-100 text-gray-400 font-bold text-base text-center cursor-not-allowed">
                    🔒 باقة للمبتدئين فقط
                  </div>
                ) : isLower ? (
                  <div className="w-full py-3.5 rounded-xl bg-gray-100 text-gray-400 font-bold text-base text-center cursor-not-allowed">
                    🔒 لا يمكن التخفيض
                  </div>
                ) : isUpgrade ? (
                  <button
                    onClick={() => handleUpgrade(plan)}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 active:scale-[0.98] transition-all text-white font-bold text-base shadow-lg flex items-center justify-center gap-2"
                  >
                    <ArrowUp className="w-5 h-5" />
                    ترقية — ادفع ${plan.price - currentPrice} فقط
                  </button>
                ) : (
                  <button
                    onClick={() => handleActivate(plan)}
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
        <p className="text-center text-xs text-gray-400">* الأرقام تقديرية بناءً على أداء السوق. النتائج الفعلية قد تتفاوت.</p>
      </div>
    </div>
  );
};

export default StoreLevels;