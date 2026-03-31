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

        {/* Earnings + Stats */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">الراتب الشهري</span>
              <span className="font-bold text-green-500">{teamEarnings}$</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>1 عضو = <span className="text-green-500 font-bold">$5</span></p>
              <p>5 أعضاء = <span className="text-green-500 font-bold">$50/شهر</span></p>
              <p>10 أعضاء = <span className="text-green-500 font-bold">$100/شهر</span></p>
            </div>
            {teamA.length < 5 && (
              <p className="text-xs text-orange-500">
                {5 - teamA.length} أعضاء باقين للوصول لـ $50/شهر
              </p>
            )}
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