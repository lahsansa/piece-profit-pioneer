import { Link } from "react-router-dom";
import { COMPANY_NAME } from "@/lib/fake-data";
import { useLang } from "@/hooks/use-lang";
import { TrendingUp, Shield, Lock } from "lucide-react";

const Footer = () => {
  const { t } = useLang();

  return (
    <footer className="gradient-navy text-primary-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-bold text-xl">
              <div className="w-8 h-8 rounded-lg gradient-profit flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              {COMPANY_NAME} Invest
            </div>
            <p className="text-sm opacity-70">{t("footerDesc")}</p>
            <div className="flex gap-3">
              <div className="flex items-center gap-1 text-xs opacity-60"><Shield className="w-3 h-3" /> {t("sslSecured")}</div>
              <div className="flex items-center gap-1 text-xs opacity-60"><Lock className="w-3 h-3" /> {t("bankGrade")}</div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4">{t("platform")}</h4>
            <div className="space-y-2 text-sm opacity-70">
              <Link to="/invest" className="block hover:opacity-100">{t("investNow")}</Link>
              <Link to="/products" className="block hover:opacity-100">{t("ourProducts")}</Link>
              <Link to="/business-plan" className="block hover:opacity-100">{t("businessPlan")}</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4">{t("company")}</h4>
            <div className="space-y-2 text-sm opacity-70">
              <span className="block">{t("aboutUs")}</span>
              <span className="block">{t("careers")}</span>
              <span className="block">{t("press")}</span>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4">{t("legal")}</h4>
            <div className="space-y-2 text-sm opacity-70">
              <span className="block">{t("terms")}</span>
              <span className="block">{t("privacy")}</span>
              <span className="block">{t("riskDisclosure")}</span>
            </div>
          </div>
        </div>
        <div className="border-t border-primary-foreground/10 pt-8 text-center text-sm opacity-50">
          {t("copyright")}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
