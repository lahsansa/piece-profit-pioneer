import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AnimatedCounter from "@/components/AnimatedCounter";
import Footer from "@/components/Footer";
import { useLang } from "@/hooks/use-lang";
import { TOTAL_PRODUCTS_SOLD, MONTHLY_PROFIT } from "@/lib/fake-data";
import { motion } from "framer-motion";
import { ShoppingBag, TrendingUp } from "lucide-react";

import earbudsImg from "@/assets/products/earbuds.jpg";
import sunglassesImg from "@/assets/products/sunglasses.jpg";
import watchImg from "@/assets/products/watch.jpg";
import walletImg from "@/assets/products/wallet.jpg";
import backpackImg from "@/assets/products/backpack.jpg";
import notebookImg from "@/assets/products/notebook.jpg";
import bottleImg from "@/assets/products/bottle.jpg";
import coffeeImg from "@/assets/products/coffee.jpg";

const productItems = [
  { id: 1, name: "Exfoliating Black Rice Ampoule", price: 7.20, sold: 3421, profit: 0.72, image: earbudsImg },
  { id: 2, name: "Heartleaf Pore Cleansing Oil", price: 5.40, sold: 2103, profit: 0.54, image: sunglassesImg },
  { id: 3, name: "Collagen & Retinol Moisturizer", price: 8.50, sold: 834, profit: 0.85, image: watchImg },
  { id: 4, name: "Bio-Oil Skincare Treatment", price: 4.90, sold: 1247, profit: 0.49, image: walletImg },
  { id: 5, name: "Miracle Spot Cover Patches", price: 3.75, sold: 1951, profit: 0.38, image: backpackImg },
  { id: 6, name: "Jade Roller & Gua Sha Set", price: 6.30, sold: 2890, profit: 0.63, image: notebookImg },
  { id: 7, name: "Antimicrobial Facial Cleanser", price: 4.10, sold: 4210, profit: 0.41, image: bottleImg },
  { id: 8, name: "Proactiv 3-Step Acne System", price: 8.70, sold: 1876, profit: 0.87, image: coffeeImg },
];

const Products = () => {
  const { t } = useLang();

  return (
    <div className="min-h-screen pt-20">
      <div className="gradient-navy text-primary-foreground py-6 px-4">
        <div className="container mx-auto flex flex-wrap justify-center gap-8">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-5 h-5 text-profit" />
            <span className="text-sm opacity-70">{t("totalSold")}</span>
            <span className="font-bold text-profit text-lg"><AnimatedCounter end={TOTAL_PRODUCTS_SOLD} /></span>
          </div>
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-profit" />
            <span className="text-sm opacity-70">{t("monthlyProfit")}:</span>
            <span className="font-bold text-profit text-lg"><AnimatedCounter end={MONTHLY_PROFIT} prefix="$" /></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-profit animate-pulse" />
            <span className="text-sm opacity-70">{t("liveTracking")}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">{t("ourProducts")}</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">{t("ourProductsDesc")}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {productItems.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
              <Card className="bg-card overflow-hidden hover:shadow-xl transition-all group rounded-xl border">
                <div className="aspect-square bg-secondary/30 flex items-center justify-center overflow-hidden">
                  <img
                    src={p.image}
                    alt={p.name}
                    loading="lazy"
                    width={512}
                    height={512}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-bold text-foreground text-base">{p.name}</h3>
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-foreground">${p.price.toFixed(2)}</span>
                    <Badge variant="secondary" className="text-profit bg-profit/10 text-xs">
                      10% → ${p.profit.toFixed(2)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <ShoppingBag className="w-3 h-3" />
                    {t("sold")} {p.sold.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Products;
