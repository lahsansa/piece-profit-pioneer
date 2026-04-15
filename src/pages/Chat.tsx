import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Star, MessageCircle, CheckCheck, Check, Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLang } from "@/hooks/use-lang";

interface Message {
  id: string;
  user_id: string;
  sender: "user" | "admin";
  content: string;
  read: boolean;
  created_at: string;
}

const Chat = () => {
  const navigate = useNavigate();
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [userRating, setUserRating] = useState<any>(null);
  const [ratingComment, setRatingComment] = useState("");
  const [showRating, setShowRating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setUserId(user.id);

      const { data: msgs } = await supabase.from("messages").select("*").eq("user_id", user.id).order("created_at", { ascending: true });
      if (msgs) setMessages(msgs);

      if (!msgs || msgs.length === 0) {
        await supabase.from("messages").insert({ user_id: user.id, sender: "admin", content: "👋 مرحباً بك! كيف يمكنني مساعدتك اليوم؟", read: false });
        const { data: newMsgs } = await supabase.from("messages").select("*").eq("user_id", user.id).order("created_at", { ascending: true });
        if (newMsgs) setMessages(newMsgs);
      }

      await supabase.from("messages").update({ read: true }).eq("user_id", user.id).eq("sender", "admin").eq("read", false);

      const { data: r } = await supabase.from("ratings").select("*").eq("user_id", user.id).maybeSingle();
      if (r) { setUserRating(r); setRating(r.stars); }

      setLoading(false);

      supabase.channel("chat-" + user.id)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `user_id=eq.${user.id}` }, (payload) => {
          const m = payload.new as Message;
          setMessages(prev => [...prev, m]);
          if (m.sender === "admin") supabase.from("messages").update({ read: true }).eq("id", m.id);
        }).subscribe();
    };
    load();
  }, [navigate]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    const { error } = await supabase.from("messages").insert({ user_id: userId, sender: "user", content, read: false });
    if (error) { toast.error("حدث خطأ في الإرسال"); setInput(content); }
    setSending(false);
  };

  const sendImage = async (file: File) => {
    if (!file || sendingImage) return;
    setSendingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("chat-images").upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(fileName);
      await supabase.from("messages").insert({ user_id: userId, sender: "user", content: `[img]${urlData.publicUrl}[/img]`, read: false });
    } catch {
      toast.error("حدث خطأ في إرسال الصورة");
    }
    setSendingImage(false);
  };

  const submitRating = async () => {
    if (!rating) return;
    const { error } = await supabase.from("ratings").upsert({ user_id: userId, stars: rating, comment: ratingComment });
    if (!error) { setUserRating({ stars: rating, comment: ratingComment }); setShowRating(false); toast.success("✅ شكراً على تقييمك!"); }
  };

  const renderMessage = (content: string) => {
    if (content.startsWith("[img]") && content.endsWith("[/img]")) {
      const url = content.slice(5, -6);
      return <img src={url} className="max-w-[220px] rounded-xl cursor-pointer" onClick={() => window.open(url, "_blank")} />;
    }
    return content;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#f0f4f8] pb-44 flex flex-col" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white pt-16 pb-4 px-4 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-base">الدعم الفني</p>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
                <p className="text-xs text-emerald-100">متصل الآن</p>
              </div>
            </div>
          </div>
          <button onClick={() => setShowRating(true)} className="flex items-center gap-1 bg-white/20 hover:bg-white/30 transition-colors rounded-full px-3 py-1.5">
            <Star className={`w-4 h-4 ${userRating ? "fill-yellow-300 text-yellow-300" : "text-white"}`} />
            <span className="text-xs font-bold">{userRating ? `${userRating.stars}/5` : "قيّم"}</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 max-w-md mx-auto w-full px-4 py-4 space-y-3 overflow-y-auto">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">ابدأ محادثتك معنا 👋</p>
          </div>
        )}

        {messages.length === 1 && messages[0].sender === "admin" && (
          <div className="space-y-2 px-2">
            <p className="text-xs text-gray-400 text-center mb-3">اختر موضوع المحادثة:</p>
            {[
              { emoji: "💰", text: "مشكل في الشحن" },
              { emoji: "📤", text: "مشكل في السحب" },
              { emoji: "📊", text: "استفسار عن الأرباح" },
              { emoji: "🔐", text: "مشكل في الحساب" },
              { emoji: "❓", text: "سؤال آخر" },
            ].map((opt) => (
              <button key={opt.text} onClick={() => setInput(opt.emoji + " " + opt.text)}
                className="w-full text-right bg-white hover:bg-emerald-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-700 flex items-center gap-2 shadow-sm">
                <span>{opt.emoji}</span><span>{opt.text}</span>
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => {
          const isUser = m.sender === "user";
          const showTime = i === messages.length - 1 || new Date(messages[i + 1].created_at).getTime() - new Date(m.created_at).getTime() > 5 * 60 * 1000;
          return (
            <div key={m.id} className={`flex ${isUser ? "justify-start" : "justify-end"}`}>
              <div className="max-w-[80%] space-y-1">
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${isUser ? "bg-white text-gray-800 rounded-tr-2xl rounded-tl-sm" : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-tl-2xl rounded-tr-sm"}`}>
                  {renderMessage(m.content)}
                </div>
                {showTime && (
                  <div className={`flex items-center gap-1 ${isUser ? "justify-start" : "justify-end"}`}>
                    <p className="text-[10px] text-gray-400">{new Date(m.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}</p>
                    {isUser && (m.read ? <CheckCheck className="w-3 h-3 text-emerald-500" /> : <Check className="w-3 h-3 text-gray-400" />)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto px-4 pb-2 space-y-2">
        {/* Image button */}
        <label className="cursor-pointer block w-full">
          <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) sendImage(f); e.target.value = ""; }} />
          <div className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed font-bold text-sm transition-colors ${sendingImage ? "border-emerald-400 bg-emerald-50 text-emerald-600" : "border-gray-300 bg-white text-gray-500 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600"}`}>
            {sendingImage
              ? <><div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /><span>جاري إرسال الصورة...</span></>
              : <><Paperclip className="w-5 h-5" /><span>📷 إرفق صورة</span></>
            }
          </div>
        </label>
        {/* Text input */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex items-center gap-2 px-3 py-2">
          <button onClick={sendMessage} disabled={!input.trim() || sending}
            className="w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 flex items-center justify-center flex-shrink-0">
            <Send className="w-4 h-4 text-white" />
          </button>
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder="اكتب رسالتك..."
            className="flex-1 text-sm bg-transparent focus:outline-none text-gray-800 placeholder:text-gray-400" />
        </div>
      </div>

      {/* Rating Modal */}
      {showRating && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4" onClick={() => setShowRating(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-800">قيّم خدمتنا</p>
              <p className="text-sm text-gray-500 mt-1">رأيك يهمنا كثيراً</p>
            </div>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onMouseEnter={() => setRatingHover(s)} onMouseLeave={() => setRatingHover(0)} onClick={() => setRating(s)} className="transition-transform hover:scale-110">
                  <Star className={`w-10 h-10 transition-colors ${s <= (ratingHover || rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                </button>
              ))}
            </div>
            {rating > 0 && <textarea placeholder="أضف تعليقك (اختياري)..." value={ratingComment} onChange={e => setRatingComment(e.target.value)} className="w-full border rounded-xl p-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-emerald-500" />}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowRating(false)}>إلغاء</Button>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!rating} onClick={submitRating}>إرسال التقييم</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;