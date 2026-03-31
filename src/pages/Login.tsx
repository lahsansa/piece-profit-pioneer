import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLang } from "@/hooks/use-lang";
import { TrendingUp, ArrowRight, Users, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Generate random referral code
const generateReferralCode = () => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLang();

  // Pre-fill referral code from URL ?ref=XXXX
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setReferralCode(ref);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        // 1. Check referral code exists
        if (!referralCode.trim()) {
          toast.error("رمز الدعوة إجباري — اطلبه من الشخص الذي دعاك");
          setLoading(false);
          return;
        }

        const { data: referrer } = await supabase
          .from("user_stores")
          .select("user_id, referral_code")
          .eq("referral_code", referralCode.trim().toUpperCase())
          .maybeSingle();

        if (!referrer) {
          toast.error("رمز الدعوة غير صحيح — تحقق منه وحاول مجدداً");
          setLoading(false);
          return;
        }

        // 2. Sign up
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;

        const newUser = signUpData.user;
        if (newUser) {
          // 3. Create user_store with referral info and new referral code
          const newReferralCode = generateReferralCode();
          await supabase.from("user_stores").insert({
            user_id: newUser.id,
            referral_code: newReferralCode,
            referred_by: referralCode.trim().toUpperCase(),
            store_level: "Small shop",
            balance: 0,
            total_topup: 0,
            total_profit: 0,
            team_earnings: 0,
          });
        }

        toast.success("تم إنشاء الحساب بنجاح! 🎉");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("مرحباً بك! 👋");
      }
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center px-4 bg-background">
      <Card className="w-full max-w-md glass-card">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-xl gradient-profit flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-6 h-6 text-accent-foreground" />
          </div>
          <CardTitle className="text-2xl">
            {isRegister ? t("createAccount") : t("welcomeBackLogin")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isRegister ? t("joinVertex") : t("signInTo")}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {/* Referral code — only on register */}
            {isRegister && (
              <div className="space-y-2">
                <div className="bg-primary/10 rounded-xl p-3 flex items-start gap-2">
                  <Users className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-primary">منصة دعوة حصرية</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-destructive" />
                      رمز الدعوة إجباري — لا يمكن إنشاء حساب بدون رمز من عضو موجود
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      🎁 اطلب رمز الدعوة من الشخص الذي دعاك للمنصة
                    </p>
                  </div>
                </div>
                <Label htmlFor="referral">
                  رمز الدعوة <span className="text-destructive">*</span> (مطلوب)
                </Label>
                <Input
                  id="referral"
                  placeholder="مثال: E37B5E07"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="font-mono text-center text-lg tracking-widest"
                  required
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full gradient-profit text-accent-foreground border-0 h-11"
              disabled={loading}
            >
              {loading ? "..." : (isRegister ? t("createAccount") : t("signIn"))}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isRegister ? t("alreadyHaveAccount") : t("dontHaveAccount")}{" "}
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-profit font-medium hover:underline"
            >
              {isRegister ? t("signInLink") : t("createOne")}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;