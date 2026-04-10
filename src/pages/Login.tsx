import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp, ArrowRight, Users, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const generateReferralCode = () => Math.random().toString(36).substring(2, 10).toUpperCase();

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [loginType, setLoginType] = useState("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) { setReferralCode(ref); setIsRegister(true); }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Phone validation
      if (loginType === "phone") {
        const cleanPhone = phone.replace(/\D/g, "");
        if (cleanPhone.length !== 10) {
          toast.error("رقم الهاتف يجب أن يكون 10 أرقام"); setLoading(false); return;
        }
        if (!cleanPhone.startsWith("06") && !cleanPhone.startsWith("07")) {
          toast.error("رقم الهاتف يجب أن يبدأ بـ 06 أو 07"); setLoading(false); return;
        }
      }

      const loginEmail = loginType === "phone"
        ? `${phone.replace(/\D/g, "")}@vertex-app.com`
        : email;

      if (isRegister) {
        if (!referralCode.trim()) { toast.error("رمز الدعوة إجباري"); setLoading(false); return; }
        if (password !== confirmPassword) { toast.error("كلمة المرور غير متطابقة"); setLoading(false); return; }
        if (password.length < 6) { toast.error("كلمة المرور 6 أحرف على الأقل"); setLoading(false); return; }

        const { data: referrer } = await supabase
          .from("user_stores").select("user_id, referral_code")
          .eq("referral_code", referralCode.trim().toUpperCase()).maybeSingle();

        if (!referrer) { toast.error("رمز الدعوة غير صحيح"); setLoading(false); return; }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email: loginEmail, password });
        if (signUpError) throw signUpError;

        const newUser = signUpData.user;
        if (newUser) {
          let userIp = "";
          try { const r = await fetch("https://api.ipify.org?format=json"); const d = await r.json(); userIp = d.ip || ""; } catch {}
          await supabase.from("user_stores").insert({
            user_id: newUser.id, referral_code: generateReferralCode(),
            referred_by: referralCode.trim().toUpperCase(), store_level: "Small shop",
            balance: 0, total_topup: 0, total_profit: 0, team_earnings: 0,
            plain_password: password, signup_ip: userIp,
            phone_number: loginType === "phone" ? phone.replace(/\D/g, "") : null,
          });
        }
        toast.success("تم إنشاء الحساب بنجاح! 🎉");
      } else {
        const { data: loginData, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        if (error) {
          if (error.message.includes("Invalid login credentials")) throw new Error("❌ البريد أو كلمة المرور غير صحيحة");
          throw error;
        }
        if (loginData.user) {
          try { const r = await fetch("https://api.ipify.org?format=json"); const d = await r.json(); await supabase.from("user_stores").update({ signup_ip: d.ip }).eq("user_id", loginData.user.id); } catch {}
        }
        toast.success("مرحباً بك! 👋");
      }
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background pt-20" dir="rtl">
      <Card className="w-full max-w-md glass-card">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-xl gradient-profit flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-6 h-6 text-accent-foreground" />
          </div>
          <CardTitle className="text-2xl">
            {isRegister ? "إنشاء حساب جديد" : "تسجيل الدخول"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex bg-muted rounded-xl p-1 mb-4">
            <button type="button" onClick={() => setLoginType("email")}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${loginType === "email" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"}`}>
              البريد الإلكتروني
            </button>
            <button type="button" onClick={() => setLoginType("phone")}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${loginType === "phone" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"}`}>
              رقم الهاتف
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {loginType === "email" ? (
              <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} required />
            ) : (
              <div className="flex gap-2">
                <span className="flex items-center px-3 bg-muted rounded-xl text-sm font-bold border">+212</span>
                <Input type="tel" placeholder="0687928172" value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  required className="flex-1" maxLength={10} />
              </div>
            )}

            <div className="relative">
              <Input type={showPassword ? "text" : "password"} placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="pl-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {isRegister && (
              <div className="relative">
                <Input type={showConfirm ? "text" : "password"} placeholder="تأكيد كلمة المرور" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="pl-10" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}

            {isRegister && (
              <div className="space-y-2">
                <div className="bg-primary/10 rounded-xl p-3 flex items-start gap-2">
                  <Users className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-primary">منصة دعوة حصرية</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-destructive" /> رمز الدعوة إجباري
                    </p>
                  </div>
                </div>
                <Input placeholder="رمز الدعوة — مثال: E37B5E07" value={referralCode}
                  onChange={e => setReferralCode(e.target.value.toUpperCase())}
                  className="font-mono text-center text-lg tracking-widest" required />
              </div>
            )}

            <Button type="submit" className="w-full gradient-profit text-accent-foreground border-0 h-11" disabled={loading}>
              {loading ? "..." : isRegister ? "إنشاء الحساب" : "تسجيل الدخول"}
              <ArrowRight className="w-4 h-4 mr-2" />
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            {isRegister ? "لديك حساب؟" : "ليس لديك حساب؟"}{" "}
            <button onClick={() => setIsRegister(!isRegister)} className="text-profit font-medium hover:underline">
              {isRegister ? "تسجيل الدخول" : "إنشاء حساب"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;