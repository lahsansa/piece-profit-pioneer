import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Footer from "@/components/Footer";
import { useLang } from "@/hooks/use-lang";
import { TOTAL_SHARES, SHARE_PRICE, MONTHLY_PROFIT } from "@/lib/fake-data";
import { Calculator, Shield, ArrowRight, CheckCircle, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Invest = () => {
  const [amount, setAmount] = useState(1000);
  const navigate = useNavigate();
  const { t } = useLang();

  const shares = Math.floor(amount / SHARE_PRICE);
  const ownership = (shares / TOTAL_SHARES) * 100;
  const monthlyEarning = (ownership / 100) * MONTHLY_PROFIT;

  const packages = [
    { shares: 100, label: t("starter") },
    { shares: 500, label: t("growth") },
    { shares: 1000, label: t("premium") },
    { shares: 5000, label: t("elite") },
  ];

  const handleInvest = () => {
    toast.success(t("redirectingPayment") as string, { description: t("demoPayment") as string });
    setTimeout(() => navigate("/dashboard"), 2000);
  };

  return (
    <div className="min-h-screen pt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{t("investInVertex")}</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">{t("investDesc")}</p>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5 text-profit" /> {t("investmentCalculator")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">{t("quickSelect")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {packages.map(p => (
                      <Button
                        key={p.shares}
                        variant={shares === p.shares ? "default" : "outline"}
                        className={shares === p.shares ? "gradient-profit text-accent-foreground border-0" : ""}
                        onClick={() => setAmount(p.shares * SHARE_PRICE)}
                      >
                        {p.label} · ${(p.shares * SHARE_PRICE).toLocaleString()}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="amount">{t("customAmount")}</Label>
                  <Input
                    id="amount"
                    type="number"
                    min={10}
                    step={10}
                    value={amount}
                    onChange={e => setAmount(Number(e.target.value))}
                    className="text-lg font-bold"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t("minShare")}</p>
                </div>

                <div className="bg-secondary rounded-xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("shares")}</span>
                    <span className="font-bold text-foreground">{shares.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("ownership")}</span>
                    <span className="font-bold text-foreground">{ownership.toFixed(4)}%</span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between">
                    <span className="text-muted-foreground">{t("projectedMonthly")}</span>
                    <span className="text-xl font-bold text-profit">${monthlyEarning.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("projectedYearly")}</span>
                    <span className="font-bold text-profit">${(monthlyEarning * 12).toFixed(2)}</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">{t("projectionDisclaimer")}</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-profit" /> {t("securePayment")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-profit/10 border border-profit/20 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">{t("youreInvesting")}</p>
                  <p className="text-3xl font-bold text-foreground">${amount.toLocaleString()}</p>
                  <p className="text-sm text-profit">{t("forShares")} {shares.toLocaleString()} {t("sharesText")} ({ownership.toFixed(4)}%)</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="cardName">{t("nameOnCard")}</Label>
                    <Input id="cardName" placeholder="John Doe" />
                  </div>
                  <div>
                    <Label htmlFor="cardNumber">{t("cardNumber")}</Label>
                    <Input id="cardNumber" placeholder="4242 4242 4242 4242" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="expiry">{t("expiry")}</Label>
                      <Input id="expiry" placeholder="MM/YY" />
                    </div>
                    <div>
                      <Label htmlFor="cvc">{t("cvc")}</Label>
                      <Input id="cvc" placeholder="123" />
                    </div>
                  </div>
                </div>

                <Button className="w-full gradient-profit text-accent-foreground border-0 h-12 text-lg" onClick={handleInvest}>
                  {t("investAmount")} ${amount.toLocaleString()} <ArrowRight className="ml-2 w-5 h-5" />
                </Button>

                <div className="space-y-2 text-xs text-muted-foreground">
                  {[t("sslEncryption"), t("noHiddenFees"), t("cancelAnytime"), t("monthlyDistributions")].map((text, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-profit" /> {text}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
                  <Shield className="w-3 h-3" /> {t("securedByStripe")}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Invest;
