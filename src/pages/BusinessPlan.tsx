import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import { useLang } from "@/hooks/use-lang";
import { Download, TrendingUp, Target, Users, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const revenueData = [
  { year: "2024", revenue: 850000, profit: 340000 },
  { year: "2025", revenue: 1700000, profit: 680000 },
  { year: "2026 (P)", revenue: 3200000, profit: 1280000 },
  { year: "2027 (P)", revenue: 5500000, profit: 2200000 },
];

const monthlyGrowth = [
  { month: "Jan", sales: 1800 }, { month: "Feb", sales: 2100 }, { month: "Mar", sales: 2340 },
  { month: "Apr", sales: 2580 }, { month: "May", sales: 2720 }, { month: "Jun", sales: 2847 },
];

const BusinessPlan = () => {
  const { t } = useLang();
  const revShareItems = t("revShareItems") as string[];

  return (
    <div className="min-h-screen pt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{t("businessPlanTitle")}</h1>
          <p className="text-lg text-muted-foreground mb-6">{t("businessPlanDesc")}</p>
          <Button className="gradient-profit text-accent-foreground border-0">
            <Download className="w-4 h-4 mr-2" /> {t("downloadPdf")}
          </Button>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          <Card className="glass-card">
            <CardHeader><CardTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-profit" /> {t("executiveSummary")}</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>{t("execSummaryP1")} <strong className="text-foreground">{t("execSummaryBold")}</strong></p>
              <p>{t("execSummaryP2")}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                {[
                  { icon: DollarSign, label: t("totalRevenue"), value: "$850K" },
                  { icon: TrendingUp, label: t("growthRate"), value: "112% YoY" },
                  { icon: Users, label: t("activeInvestors"), value: "1,247" },
                  { icon: Target, label: t("profitMargin"), value: "40%" },
                ].map((s, i) => (
                  <div key={i} className="bg-secondary rounded-lg p-3 text-center">
                    <s.icon className="w-5 h-5 text-profit mx-auto mb-1" />
                    <div className="text-lg font-bold text-foreground">{s.value}</div>
                    <div className="text-xs">{s.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-profit" /> {t("financialProjections")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                  <XAxis dataKey="year" stroke="hsl(215, 16%, 47%)" fontSize={12} />
                  <YAxis stroke="hsl(215, 16%, 47%)" fontSize={12} tickFormatter={v => `$${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                  <Bar dataKey="revenue" fill="hsl(213, 72%, 15%)" radius={[4, 4, 0, 0]} name="Revenue" />
                  <Bar dataKey="profit" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} name="Net Profit" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader><CardTitle>{t("monthlySalesGrowth")}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                  <XAxis dataKey="month" stroke="hsl(215, 16%, 47%)" fontSize={12} />
                  <YAxis stroke="hsl(215, 16%, 47%)" fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="sales" stroke="hsl(160, 84%, 39%)" strokeWidth={3} dot={{ fill: "hsl(160, 84%, 39%)" }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-profit" /> {t("revenueSharingRules")}</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <div className="bg-profit/10 border border-profit/20 rounded-lg p-4">
                <p className="font-semibold text-foreground text-lg mb-2">{t("revShareRule")}</p>
              </div>
              <ul className="space-y-2">
                {revShareItems.map((item, i) => (
                  <li key={i} className="flex gap-2"><span className="text-profit font-bold">•</span> {item}</li>
                ))}
              </ul>
              <div className="bg-secondary rounded-lg p-4">
                <p className="text-sm"><strong className="text-foreground">{t("revShareExample")}</strong> {t("revShareExampleText")} <span className="text-profit font-bold">{t("revShareExampleAmount")}</span> {t("revShareExampleEnd")}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default BusinessPlan;
