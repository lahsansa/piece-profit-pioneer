import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, Bell, CheckCheck } from "lucide-react";

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) setNotifications(data);
      setLoading(false);

      // Mark all as read
      await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    };
    load();
  }, [navigate]);

  const handleClick = (notif: any) => {
    // If notification has a link (topup), navigate to it
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const getBg = (type: string) => {
    if (type === "success") return "bg-green-50 border-green-200";
    if (type === "warning") return "bg-orange-50 border-orange-200";
    if (type === "upgrade") return "bg-purple-50 border-purple-200";
    return "bg-blue-50 border-blue-200";
  };

  const getIcon = (type: string) => {
    if (type === "success") return "✅";
    if (type === "warning") return "⚠️";
    if (type === "upgrade") return "⬆️";
    return "🔔";
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="bg-white flex items-center justify-between px-4 py-4 pt-12">
        <button onClick={() => navigate(-1)} className="p-1">
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">الإشعارات</h1>
        <span className="w-8" />
      </div>

      <div className="p-4 space-y-3 max-w-md mx-auto">
        {loading ? (
          <p className="text-center text-gray-400 py-8">جاري التحميل...</p>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">لا توجد إشعارات</p>
          </div>
        ) : (
          notifications.map((notif: any) => (
            <div
              key={notif.id}
              onClick={() => handleClick(notif)}
              className={`rounded-2xl border p-4 ${getBg(notif.type)} ${notif.link ? "cursor-pointer active:scale-[0.98] transition-all" : ""} ${!notif.read ? "shadow-md" : "opacity-80"}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getIcon(notif.type)}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 leading-relaxed" dir="rtl">
                    {notif.message}
                  </p>
                  {notif.link && (
                    <div className="mt-2 inline-flex items-center gap-1 bg-white text-primary text-xs font-bold px-3 py-1.5 rounded-full border border-primary/20">
                      اضغط للدفع →
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(notif.created_at).toLocaleString("ar")}
                  </p>
                </div>
                {!notif.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;