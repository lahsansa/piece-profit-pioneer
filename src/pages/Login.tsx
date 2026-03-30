import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLang } from "@/hooks/use-lang";
import { TrendingUp, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLang();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success(t("accountCreated") as string, { description: "تم إنشاء الحساب بنجاح" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t("welcomeBackToast") as string);
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
          <CardTitle className="text-2xl">{isRegister ? t("createAccount") : t("welcomeBackLogin")}</CardTitle>
          <p className="text-sm text-muted-foreground">{isRegister ? t("joinVertex") : t("signInTo")}</p>
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
            <Button type="submit" className="w-full gradient-profit text-accent-foreground border-0 h-11" disabled={loading}>
              {loading ? "..." : (isRegister ? t("createAccount") : t("signIn"))} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isRegister ? t("alreadyHaveAccount") : t("dontHaveAccount")}{" "}
            <button onClick={() => setIsRegister(!isRegister)} className="text-profit font-medium hover:underline">
              {isRegister ? t("signInLink") : t("createOne")}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
