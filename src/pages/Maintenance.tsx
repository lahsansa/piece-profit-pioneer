import { motion } from "framer-motion";
import { Settings, Clock } from "lucide-react";

const Maintenance = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 to-teal-900 flex items-center justify-center px-4" dir="rtl">
      <div className="text-center space-y-6 max-w-sm w-full">

        {/* Animated icon */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto"
        >
          <Settings className="w-10 h-10 text-emerald-300" />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <h1 className="text-2xl font-bold text-white">الموقع في صيانة مؤقتة</h1>
          <p className="text-emerald-200 text-sm leading-relaxed">
            نحن نعمل على تحسين تجربتك وتطوير المنصة.
            <br />
            سنعود قريباً بشكل أفضل! 🚀
          </p>
        </motion.div>

        {/* Timer badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-white/10 backdrop-blur rounded-2xl p-4 space-y-2"
        >
          <div className="flex items-center justify-center gap-2 text-emerald-300">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-bold">وقت العودة المتوقع</span>
          </div>
          <p className="text-white font-bold text-lg">قريباً جداً ⏳</p>
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="space-y-2"
        >
          <p className="text-emerald-300 text-xs">✅ أرصدتك وبياناتك بأمان تام</p>
          <p className="text-emerald-300 text-xs">✅ لن تخسر أي أرباح خلال فترة الصيانة</p>
          <p className="text-emerald-300 text-xs">✅ سيتم إخطارك فور العودة</p>
        </motion.div>

        {/* Logo */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-white/40 text-xs pt-4"
        >
          Vertex Invest Platform
        </motion.p>
      </div>
    </div>
  );
};

export default Maintenance;