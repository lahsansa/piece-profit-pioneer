import { motion } from "framer-motion";
import { Copy, AlertTriangle, Check, Upload, Send } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const WALLET_ADDRESS = "TQkQj9Ru2VTTEHokygVKZdoWTKsJcMgASj";

const TopupBalance = () => {
  const [searchParams] = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState("");
  const [planName, setPlanName] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [topupHistory, setTopupHistory] = useState<any[]>([]);
  const [hasPending, setHasPending] = useState(false);
  const [zoomedImg, setZoomedImg] = useState<string | null>(null);

  useEffect(() => {
    const urlAmount = searchParams.get("amount");
    const urlPlan = searchParams.get("plan");
    if (urlAmount) setAmount(urlAmount);
    if (urlPlan) setPlanName(urlPlan);
    loadHistory();
  }, [searchParams]);

  const loadHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("topups").select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) {
      setTopupHistory(data);
      setHasPending(data.some(t => t.status === "pending"));
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(WALLET_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setScreenshot(file); setPreview(URL.createObjectURL(file)); }
  };

  const handleSubmit = async () => {
    if (hasPending) {
      toast.error("⏳ لديك طلب شحن قيد المراجعة — انتظر حتى يتم الرد عليه");
      return;
    }
    if (!amount || Number(amount) < 10) { toast.error("المبلغ يجب أن يكون 10 USDT على الأقل"); return; }
    if (!screenshot) { toast.error("يرجى رفع صورة إثبات الدفع"); return; }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("يرجى تسجيل الدخول أولاً"); setLoading(false); return; }

      // Double check no pending
      const { data: existing } = await supabase.from("topups")
        .select("id").eq("user_id", user.id).eq("status", "pending").limit(1);
      if (existing && existing.length > 0) {
        toast.error("⏳ لديك طلب شحن قيد المراجعة — انتظر حتى يتم الرد عليه");
        setLoading(false);
        return;
      }

      const fileExt = screenshot.name.split(".").pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("topup-screenshots").upload(fileName, screenshot);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("topup-screenshots").getPublicUrl(fileName);

      const { error: insertError } = await supabase.from("topups").insert({
        user_id: user.id,
        amount_usdt: Number(amount),
        txid: fileName,
        status: "pending",
        screenshot_url: urlData.publicUrl,
      });
      if (insertError) throw insertError;

      toast.success("✅ تم إرسال طلب الشحن! سيتم مراجعته خلال 30 دقيقة");
      setScreenshot(null);
      setPreview(null);
      await loadHistory();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28" dir="rtl">

      {/* Image zoom */}
      {zoomedImg && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setZoomedImg(null)}>
          <img src={zoomedImg} className="max-w-full max-h-full rounded-2xl" />
          <p className="absolute bottom-6 text-white/60 text-xs">اضغط للإغلاق</p>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">شحن الرصيد</h1>
          {planName && (
            <div className="mt-2 inline-block bg-emerald-100 text-emerald-700 text-sm font-bold px-4 py-1.5 rounded-full">
              🚀 تفعيل {planName}
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* LEFT — Form */}
          <div className="space-y-4">

            {/* Pending warning */}
            {hasPending && (
              <div className="bg-orange-50 border border-orange-300 rounded-2xl p-4 text-center">
                <p className="text-orange-700 font-bold text-sm">⏳ لديك طلب شحن قيد المراجعة</p>
                <p className="text-orange-500 text-xs mt-1">لا يمكنك إرسال طلب جديد حتى يتم الرد على طلبك الحالي</p>
              </div>
            )}

            {/* Warning */}
            <Alert className="border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <AlertDescription className="text-sm text-destructive font-medium space-y-1 mr-2">
                <p>⚠️ أرسل فقط USDT على شبكة TRC20</p>
                <p>⚠️ الحد الأدنى للشحن: 10 USDT</p>
              </AlertDescription>
            </Alert>

            {/* Amount banner */}
            {amount && (
              <div className="bg-emerald-600 text-white rounded-2xl p-4 text-center">
                <p className="text-sm opacity-90">المبلغ المطلوب</p>
                <p className="text-3xl font-bold mt-1">{amount} <span className="text-xl">USDT</span></p>
              </div>
            )}

            {/* Wallet */}
            <Card className="border-primary/20">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground text-center">أرسل إلى هذا العنوان:</p>
                <div className="flex justify-center">
                  <div className="bg-white p-2 rounded-xl shadow-sm">
                    <QRCodeSVG value={WALLET_ADDRESS} size={140} level="H" />
                  </div>
                </div>
                <div onClick={handleCopy} className="bg-muted rounded-xl p-3 text-center cursor-pointer border-2 border-dashed border-primary/30 hover:border-primary/60 transition-colors">
                  <p className="text-xs text-muted-foreground mb-1">اضغط للنسخ</p>
                  <p className="text-xs font-mono font-semibold text-foreground break-all">{WALLET_ADDRESS}</p>
                </div>
                <Button onClick={handleCopy} className="w-full h-10 font-bold gap-2" variant={copied ? "secondary" : "default"}>
                  {copied ? <><Check className="w-4 h-4" />تم النسخ!</> : <><Copy className="w-4 h-4" />نسخ العنوان</>}
                </Button>
              </CardContent>
            </Card>

            {/* Submit form */}
            <Card className={hasPending ? "opacity-50 pointer-events-none" : ""}>
              <CardContent className="p-4 space-y-3">
                <h2 className="text-base font-bold text-foreground">إرسال إثبات الدفع</h2>
                <div>
                  <Label>المبلغ المرسل (USDT)</Label>
                  <Input type="number" placeholder="مثال: 92" value={amount}
                    onChange={(e) => setAmount(e.target.value)} min="10" className="mt-1" />
                </div>
                <div>
                  <Label>صورة إثبات الدفع</Label>
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-primary/30 rounded-xl cursor-pointer hover:border-primary/60 transition-colors bg-muted/30 mt-1">
                    {preview ? (
                      <img src={preview} alt="preview" className="h-full w-full object-contain rounded-xl p-1" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <Upload className="w-6 h-6" />
                        <span className="text-xs">اضغط لرفع الصورة</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </label>
                </div>
                <Button onClick={handleSubmit} disabled={loading || hasPending}
                  className="w-full h-11 font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                  {loading ? "جاري الإرسال..." : hasPending ? "⏳ انتظر الرد على طلبك" : <><Send className="w-4 h-4" />إرسال طلب الشحن</>}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT — History */}
          <div>
            <Card className="border-0 shadow-md h-full">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-bold text-foreground">📋 سجل الشحنات</h3>
                {topupHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">لا توجد شحنات بعد</p>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {topupHistory.map(t => (
                      <div key={t.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                        <div className="flex items-center gap-2">
                          {t.status === "pending" && <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />}
                          {t.status === "confirmed" && <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />}
                          {t.status === "rejected" && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />}
                          <div>
                            <p className="text-sm font-bold text-foreground">{t.amount_usdt} USDT</p>
                            <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("en-GB", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {t.status === "pending" && <span className="text-xs text-orange-500 font-medium">⏳ مراجعة</span>}
                          {t.status === "confirmed" && <span className="text-xs text-green-600 font-bold">✅ مقبول</span>}
                          {t.status === "rejected" && <span className="text-xs text-red-500 font-bold">❌ مرفوض</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TopupBalance;