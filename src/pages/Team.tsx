import { useLang } from "@/hooks/use-lang";
import { Users, Copy, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface TeamMember {
  user_id: string;
  store_level: string;
  balance: number;
  total_topup: number;
  created_at: string;
}

const Team = () => {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const navigate = useNavigate();

  const [referralCode, setReferralCode] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [teamA, setTeamA] = useState<TeamMember[]>([]);
  const [teamB, setTeamB] = useState<TeamMember[]>([]);
  const [teamC, setTeamC] = useState<TeamMember[]>([]);
  const [activeTab, setActiveTab] = useState<"A" | "B" | "C">("A");
  const [copied, setCopied] = useState(false);
  const [teamEarnings, setTeamEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [calcMembers, setCalcMembers] = useState(0);
  const [calcPack, setCalcPack] = useState(99);

  const COMMISSIONS: Record<number, number> = { 45: 5, 99: 10, 350: 20, 750: 45, 1100: 75, 1650: 85, 2200: 110 };
  const SALARIES: Record<number, number> = { 45: 1, 99: 3, 350: 11, 750: 23, 1100: 38, 1650: 49, 2200: 60 };

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }

    // Get my referral code
    const { data: myStore } = await supabase
      .from("user_stores")
      .select("referral_code, team_earnings")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!myStore?.referral_code) { setLoading(false); return; }

    const myCode = myStore.referral_code;
    setReferralCode(myCode);
    setReferralLink(`${window.location.origin}/login?ref=${myCode}`);
    setTeamEarnings(Number(myStore.team_earnings || 0));

    // Team A — direct referrals (referred_by = myCode)
    const { data: levelA } = await supabase
      .from("user_stores")
      .select("user_id, store_level, balance, total_topup, created_at")
      .eq("referred_by", myCode);

    const aMembers = levelA || [];
    setTeamA(aMembers);

    // Team B — referrals of my referrals
    if (aMembers.length > 0) {
      const aCodes = aMembers.map((m: any) => m.referral_code).filter(Boolean);
      // Get referral codes of team A members
      const { data: aStores } = await supabase
        .from("user_stores")
        .select("referral_code")
        .in("user_id", aMembers.map((m: any) => m.user_id));

      const aReferralCodes = (aStores || []).map((s: any) => s.referral_code).filter(Boolean);

      if (aReferralCodes.length > 0) {
        const { data: levelB } = await supabase
          .from("user_stores")
          .select("user_id, store_level, balance, total_topup, created_at")
          .in("referred_by", aReferralCodes);
        const bMembers = levelB || [];
        setTeamB(bMembers);

        // Team C — referrals of team B
        if (bMembers.length > 0) {
          const { data: bStores } = await supabase
            .from("user_stores")
            .select("referral_code")
            .in("user_id", bMembers.map((m: any) => m.user_id));

          const bReferralCodes = (bStores || []).map((s: any) => s.referral_code).filter(Boolean);

          if (bReferralCodes.length > 0) {
            const { data: levelC } = await supabase
              .from("user_stores")
              .select("user_id, store_level, balance, total_topup, created_at")
              .in("referred_by", bReferralCodes);
            setTeamC(levelC || []);
          }
        }
      }
    }

    setLoading(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast.success("تم نسخ رمز الدعوة!");
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("تم نسخ رابط الدعوة!");
  };

  const currentTeam = activeTab === "A" ? teamA : activeTab === "B" ? teamB : teamC;

  const storeLevelAr: Record<string, string> = {
    "Small shop": "متجر صغير",
    "Medium shop": "متجر متوسط",
    "Large shop": "متجر كبير",
    "Mega shop": "متجر ميغا",
    "VIP": "VIP",
  };

  return (
    <div className="min-h-screen bg-background pt-16 pb-24 px-4" dir="rtl">
      <div className="max-w-md mx-auto space-y-4 py-4">

        {/* Referral Card */}
        <Card className="bg-primary text-primary-foreground border-0">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm opacity-80">رمز الدعوة</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-widest font-mono">{referralCode || "..."}</span>
                <Button size="sm" variant="secondary" onClick={copyCode} className="h-8 px-3">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span className="mr-1 text-xs">نسخ</span>
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs opacity-70 truncate flex-1 font-mono">{referralLink}</span>
              <Button size="sm" variant="secondary" onClick={copyLink} className="h-8 px-3 flex-shrink-0">
                <Copy className="w-4 h-4" />
                <span className="mr-1 text-xs">نسخ</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Referral Calculator */}
        {(() => {
          const commission = COMMISSIONS[calcPack] * calcMembers;
          const salary = SALARIES[calcPack] * calcMembers;
          return (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-bold text-foreground">🧮 حاسبة الأرباح</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">عدد الأعضاء</p>
                    <input
                      type="number"
                      min={1}
                      placeholder="مثال: 10"
                      className="w-full border rounded-xl px-3 py-2 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                      onChange={e => setCalcMembers(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">الباقة</p>
                    <select
                      className="w-full border rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                      value={calcPack}
                      onChange={e => setCalcPack(Number(e.target.value))}
                    >
                      <option value="45">باقة $45</option>
                      <option value="99">باقة $99</option>
                      <option value="350">باقة $350</option>
                      <option value="750">باقة $750</option>
                      <option value="1100">باقة $1100</option>
                      <option value="1650">باقة $1650</option>
                      <option value="2200">باقة $2200</option>
                    </select>
                  </div>
                </div>
                <div className="bg-muted/40 rounded-xl p-3 space-y-1.5">
                  {calcMembers === 0 ? (
                    <p className="text-center text-xs text-muted-foreground">أدخل عدد الأعضاء لحساب أرباحك</p>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">عمولة فورية</span>
                        <span className="text-sm font-bold text-blue-600">${commission}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">راتب شهري</span>
                        <span className="text-sm font-bold text-green-600">${salary}/شهر</span>
                      </div>
                      <div className="flex justify-between border-t border-border/50 pt-2 mt-1">
                        <span className="text-xs font-bold">المجموع سنة</span>
                        <span className="text-sm font-bold text-purple-600">${commission + salary * 12}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })()}


        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-border/50 pb-2">
              <span className="text-sm font-bold text-foreground">إجمالي عمولاتي</span>
              <span className="font-bold text-green-500 text-lg">{teamEarnings}$</span>
            </div>
            <p className="text-xs font-bold text-muted-foreground">🎁 عمولة + ربح شهري حسب باقة العضو:</p>
            <div className="space-y-1.5">
              <div className="grid grid-cols-3 gap-1 text-[10px] text-muted-foreground font-bold px-2">
                <span>الباقة</span>
                <span className="text-center text-blue-500">عمولة فورية</span>
                <span className="text-center text-green-500">ربح/شهر</span>
              </div>
              {[
                { pack: "$45",   commission: "$5",   salary: "$1" },
                { pack: "$99",   commission: "$10",  salary: "$3" },
                { pack: "$350",  commission: "$20",  salary: "$11" },
                { pack: "$750",  commission: "$45",  salary: "$23" },
                { pack: "$1100", commission: "$75",  salary: "$38" },
                { pack: "$1650", commission: "$85",  salary: "$49" },
                { pack: "$2200", commission: "$110", salary: "$60" },
              ].map((row) => (
                <div key={row.pack} className="grid grid-cols-3 gap-1 bg-muted/40 rounded-lg px-2 py-1.5 items-center">
                  <span className="text-xs text-muted-foreground">باقة {row.pack}</span>
                  <span className="text-xs font-bold text-blue-500 text-center">{row.commission}</span>
                  <span className="text-xs font-bold text-green-500 text-center">{row.salary}/شهر</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Team Tabs */}
        <div className="flex gap-2">
          {(["A", "B", "C"] as const).map((tab) => {
            const count = tab === "A" ? teamA.length : tab === "B" ? teamB.length : teamC.length;
            return (
              <Button
                key={tab}
                variant={activeTab === tab ? "default" : "outline"}
                className="flex-1"
                onClick={() => setActiveTab(tab)}
              >
                فريق {tab}
                {count > 0 && <Badge className="mr-2 bg-green-500 text-white text-xs">{count}</Badge>}
              </Button>
            );
          })}
        </div>

        {/* Team Stats */}
        <Card className="bg-primary text-primary-foreground border-0">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-xs opacity-70">المستخدمون الصالحون</p>
                <p className="text-2xl font-bold">{currentTeam.filter(m => m.total_topup > 0).length}</p>
              </div>
              <div>
                <p className="text-xs opacity-70">حجم الفريق</p>
                <p className="text-2xl font-bold">{currentTeam.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        {loading ? (
          <p className="text-center text-muted-foreground text-sm py-4">جاري التحميل...</p>
        ) : currentTeam.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">لا يوجد أعضاء في فريق {activeTab} بعد</p>
              <p className="text-xs text-muted-foreground mt-1">شارك رمز الدعوة لبناء فريقك</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {currentTeam.map((member) => (
              <Card key={member.user_id} className="border-0 shadow-sm">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold font-mono">{member.user_id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">
                        {isAr ? (storeLevelAr[member.store_level] || member.store_level) : member.store_level}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-500">{Number(member.total_topup).toFixed(0)} $</p>
                    <Badge variant={member.total_topup > 0 ? "default" : "secondary"} className="text-xs">
                      {member.total_topup > 0 ? "✅ نشط" : "⏳ غير نشط"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Team;