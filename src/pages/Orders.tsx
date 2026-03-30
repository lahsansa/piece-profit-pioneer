import { useLang } from "@/hooks/use-lang";
import { ClipboardList } from "lucide-react";

const Orders = () => {
  const { lang } = useLang();
  const isAr = lang === "ar";

  return (
    <div className="min-h-screen bg-background pt-16 pb-24 px-4">
      <div className="max-w-md mx-auto flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <ClipboardList className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">
          {isAr ? "الطلبات" : "My Orders"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {isAr ? "قريباً... تتبع طلباتك واستثماراتك هنا." : "Coming soon... Track your orders and investments here."}
        </p>
      </div>
    </div>
  );
};

export default Orders;
