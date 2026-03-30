import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { COMPANY_NAME } from "@/lib/fake-data";
import { useLang } from "@/hooks/use-lang";
import { TrendingUp, Globe } from "lucide-react";

const Navbar = () => {
  const { lang, setLang } = useLang();
  const location = useLocation();

  if (location.pathname === "/admin") return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto flex items-center justify-between h-14 px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <div className="w-8 h-8 rounded-lg gradient-profit flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-accent-foreground" />
          </div>
          <span className="text-foreground">{COMPANY_NAME}</span>
          <span className="text-profit text-sm font-medium">Invest</span>
        </Link>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLang(lang === "en" ? "ar" : "en")}
          className="gap-1"
        >
          <Globe className="w-4 h-4" />
          {lang === "en" ? "عربي" : "English"}
        </Button>
      </div>
    </nav>
  );
};

export default Navbar;