import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AnimatedCounter from "@/components/AnimatedCounter";
import Footer from "@/components/Footer";
import { useLang } from "@/hooks/use-lang";
import { MONTHLY_SALES, TOTAL_PRODUCTS_SOLD, MONTHLY_PROFIT, testimonials } from "@/lib/fake-data";
import { TrendingUp, DollarSign, ShoppingBag, BarChart3, Shield, Eye, Wallet, ArrowRight, Star, CheckCircle } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const Landing = () => {
  const { t } = useLang();

  const steps = [
    { icon: Wallet, title: t("step1Title"), desc: t("step1Desc") },
    { icon: ShoppingBag, title: t("step2Title"), desc: t("step2Desc") },
    { icon: BarChart3, title: t("step3Title"), desc: t("step3Desc") },
    { icon: DollarSign, title: t("step4Title"), desc: t("step4Desc") },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="gradient-hero text-primary-foreground pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, hsl(160, 84%, 39%) 0%, transparent 50%)" }} />
        <div className="container mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 bg-profit/10 border border-profit/20 rounded-full px-4 py-1.5 mb-6 text-sm">
              <span className="w-2 h-2 rounded-full bg-profit animate-pulse" />
              <span className="text-profit font-medium">{t("heroLive")} <AnimatedCounter end={MONTHLY_SALES} suffix={` ${t("heroLiveSales")}`} /></span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              {t("heroTitle1")}{" "}
              <span className="text-profit">{t("heroTitle2")}</span>
            </h1>
            <p className="text-lg md:text-xl opacity-80 max-w-2xl mx-auto mb-8">
              {t("heroSubtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link to="/invest">
                <Button size="lg" className="gradient-profit text-accent-foreground border-0 text-lg px-8 h-14 animate-pulse-glow">
                  {t("investNow")} <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/products">
                <Button size="lg" variant="outline" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 text-lg px-8 h-14">
                  {t("seeProducts")}
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }} className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { label: t("productsSold"), value: TOTAL_PRODUCTS_SOLD, prefix: "" },
              { label: t("monthlyProfit"), value: MONTHLY_PROFIT, prefix: "$" },
              { label: t("investorsPaid"), value: 1247, prefix: "" },
            ].map((s, i) => (
              <div key={i} className="bg-primary-foreground/5 backdrop-blur-sm border border-primary-foreground/10 rounded-xl p-4">
                <div className="text-2xl md:text-3xl font-bold text-profit">
                  <AnimatedCounter end={s.value} prefix={s.prefix} />
                </div>
                <div className="text-sm opacity-60">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t("howItWorks")}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{t("howItWorksDesc")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <motion.div key={i} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <Card className="glass-card text-center h-full hover:shadow-xl transition-shadow">
                  <CardContent className="p-6 space-y-4">
                    <div className="w-14 h-14 rounded-2xl gradient-profit flex items-center justify-center mx-auto">
                      <step.icon className="w-7 h-7 text-accent-foreground" />
                    </div>
                    <div className="text-xs font-semibold text-profit">{t("step")} {i + 1}</div>
                    <h3 className="text-lg font-bold text-foreground">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="py-12 px-4 bg-secondary/50">
        <div className="container mx-auto">
          <div className="flex flex-wrap justify-center gap-8 items-center">
            {[
              { icon: Shield, text: t("secCompliant") },
              { icon: Eye, text: t("transparent") },
              { icon: CheckCircle, text: t("audited") },
              { icon: TrendingUp, text: t("realTimeTracking") },
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-muted-foreground">
                <b.icon className="w-5 h-5 text-profit" />
                <span className="text-sm font-medium">{b.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">{t("whatInvestorsSay")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((te, i) => (
              <motion.div key={i} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <Card className="glass-card h-full">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex gap-1">{[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-profit text-profit" />)}</div>
                    <p className="text-foreground italic">"{te.quote}"</p>
                    <div className="border-t border-border pt-4">
                      <div className="font-semibold text-foreground">{te.name}</div>
                      <div className="text-sm text-muted-foreground">{te.role}</div>
                      <div className="text-sm font-bold text-profit">{te.amount}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 gradient-navy text-primary-foreground">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("ctaTitle")}</h2>
          <p className="opacity-70 mb-8 max-w-lg mx-auto">{t("ctaDesc")}</p>
          <Link to="/invest">
            <Button size="lg" className="gradient-profit text-accent-foreground border-0 text-lg px-8 h-14">
              {t("investNow")} <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
