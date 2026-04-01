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
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const WALLET_ADDRESS = "TXrZ9BGi7H5kkGJN6u5rL4rDPxu7A1CxQN";

const TopupBalance = () => {
  const [searchParams] = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState("");
  const [planName, setPlanName] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [upgradeTo, setUpgradeTo] = useState("");

  useEffect(() => {
    const urlAmount = searchParams.get("amount");
    const urlPlan = searchParams.get("plan");
    const urlUpgradeTo = searchParams.get("to");
    if (urlAmount) setAmount(urlAmount);
    if (urlPlan) setPlanName(urlPlan);
    if (urlUpgradeTo) setUpgradeTo(urlUpgradeTo);
  }, [searchParams]);

  const handleCopy = () => {
    navigator.clipboard.writeText(WALLET_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshot(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!amount || Number(amount) < 10) {
      toast.error("المبلغ يجب أن يكون 10 USDT على الأقل");
      return;
    }
    if (!screenshot) {
      toast.error("يرجى رفع صورة إثبات الدفع");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("يرجى تسجيل الدخول أولاً"); setLoading(false); return; }

      const fileExt = screenshot.name.split(".").pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("topup-screenshots")
        .upload(fileName, screenshot);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("topup-screenshots").getPublicUrl(fileName);

      const { error: insertError } = await supabase.from("topups").insert({
        user_id: user.id,
        amount_usdt: Number(amount),
        txid: fileName,
        status: "pending",
        screenshot_url: urlData.publicUrl,
        ...(upgradeTo ? { upgrade_to: upgradeTo } : {}),
      });
      if (insertError) throw insertError;

      toast.success("✅ تم إرسال طلب الشحن! سيتم مراجعته خلال 30 دقيقة");
      setAmount(searchParams.get("amount") || "");
      setScreenshot(null);
      setPreview(null);
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28" dir="rtl">
      <div className="max-w-md mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h1 className="text-2xl font-bold text-foreground">شحن الرصيد</h1>
          {planName && (
            <div className="mt-2 inline-block bg-emerald-100 text-emerald-700 text-sm font-bold px-4 py-1.5 rounded-full">
              🚀 تفعيل {planName}
            </div>
          )}
        </motion.div>

        {/* Warning */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Alert className="border-destructive/50 bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDescription className="text-sm text-destructive font-medium space-y-1.5 mr-2">
              <p>⚠️ أرسل فقط USDT على شبكة TRC20</p>
              <p>⚠️ الحد الأدنى للشحن: 10 USDT</p>
            </AlertDescription>
          </Alert>
        </motion.div>

        {/* Amount required banner */}
        {amount && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}>
            <div className="bg-emerald-600 text-white rounded-2xl p-4 text-center">
              <p className="text-sm opacity-90">المبلغ المطلوب للتفعيل</p>
              <p className="text-4xl font-bold mt-1">{amount} <span className="text-2xl">USDT</span></p>
            </div>
          </motion.div>
        )}

        {/* Wallet Address */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-primary/20">
            <CardContent className="p-5 space-y-4">
              <p className="text-base font-semibold text-foreground text-center">أرسل إلى هذا العنوان:</p>
              <div className="flex justify-center">
                <div className="bg-white p-3 rounded-xl shadow-sm">
                  <QRCodeSVG value={WALLET_ADDRESS} size={180} level="H" />
                </div>
              </div>
              <div onClick={handleCopy} className="bg-muted rounded-xl p-4 text-center cursor-pointer border-2 border-dashed border-primary/30 hover:border-primary/60 transition-colors">
                <p className="text-xs text-muted-foreground mb-1">اضغط للنسخ</p>
                <p className="text-sm font-mono font-semibold text-foreground break-all leading-relaxed">{WALLET_ADDRESS}</p>
              </div>
              <Button onClick={handleCopy} className="w-full h-12 text-base font-bold gap-2" variant={copied ? "secondary" : "default"}>
                {copied ? <><Check className="w-5 h-5" />تم النسخ!</> : <><Copy className="w-5 h-5" />نسخ العنوان</>}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Submit Form */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="text-lg font-bold text-foreground">إرسال إثبات الدفع</h2>

              <div className="space-y-2">
                <Label>المبلغ المرسل (USDT)</Label>
                <Input
                  type="number"
                  placeholder="مثال: 92"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="10"
                />
              </div>

              <div className="space-y-2">
                <Label>صورة إثبات الدفع (screenshot)</Label>
                <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-primary/30 rounded-xl cursor-pointer hover:border-primary/60 transition-colors bg-muted/30">
                  {preview ? (
                    <img src={preview} alt="preview" className="h-full w-full object-contain rounded-xl p-1" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Upload className="w-8 h-8" />
                      <span className="text-sm">اضغط لرفع الصورة</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              </div>

              <Button onClick={handleSubmit} disabled={loading} className="w-full h-12 text-base font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                {loading ? "جاري الإرسال..." : <><Send className="w-5 h-5" />إرسال طلب الشحن</>}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default TopupBalance;