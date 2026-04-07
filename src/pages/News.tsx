import { useLang } from "@/hooks/use-lang";
import { Newspaper, CheckCircle, TrendingUp, Megaphone, Gift, ShieldCheck, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AnimatedCounter from "@/components/AnimatedCounter";

const News = () => {
  const { lang } = useLang();
  const isAr = lang === "ar";

  const recentUpdates = [
    { icon: Gift, text: "تم إضافة مستويات جديدة (XL و Premium)", date: "2026-04-05" },
    { icon: Megaphone, text: "نظام الإحالة الجديد يمنح 8% عمولة", date: "2026-04-03" },
    { icon: ShieldCheck, text: "التحقق اليدوي للشحنات يضمن الشفافية", date: "2026-04-01" },
    { icon: TrendingUp, text: "تم توزيع أرباح شهر مارس على جميع المستثمرين", date: "2026-03-30" },
  ];

  return (
    <div className="min-h-screen bg-background pt-16 pb-24 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-5 py-6">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Newspaper className="w-5 h-5 text-emerald-500" />
          </div>
          <h1 className="text-xl font-bold text-foreground">الأخبار والتحديثات</h1>
        </div>

        {/* Main Announcement */}
        <Card className="border-emerald-500/30 bg-emerald-500/5 overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <CardHeader className="pb-2 pt-5">
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
                تحديث مهم
              </Badge>
              <span className="text-xs text-muted-foreground">اليوم</span>
            </div>
            <CardTitle className="text-lg text-foreground">تحديث مهم: عودة الأرباح القوية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              في الأيام الأولى بعد الإطلاق حققنا أرباحًا كبيرة، وشاركنا فيها مع جميع المستثمرين.
            </p>
            <p>
              الآن انتهت المرحلة الترويجية، وسنعود إلى نمط الأرباح الطبيعي والمستدام.
            </p>
            <p className="text-emerald-600 dark:text-emerald-400 font-medium">
              نحن نعمل على المدى البعيد لضمان ربح مستمر وشفاف لكل مستثمر.
            </p>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              تذكير: كيف تربح معنا
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                تشتري مستوى متجر مرة واحدة
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                تحصل على عمولة ثابتة من كل قطعة تباع من متجرك
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                + نسبة من إجمالي أرباح الشركة كل شهر (حسب حصتك)
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Recent Updates */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">آخر التحديثات</h2>
          <div className="space-y-2.5">
            {recentUpdates.map((item, i) => (
              <Card key={i} className="p-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{item.text}</p>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      {item.date}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Live Counter */}
        <Card className="text-center border-emerald-500/20">
          <CardContent className="py-6">
            <p className="text-xs text-muted-foreground mb-1">إجمالي الأرباح الموزعة حتى الآن</p>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              <AnimatedCounter end={142350} prefix="$" suffix=" USD" duration={2500} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default News;