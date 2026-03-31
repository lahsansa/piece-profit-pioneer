import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LangProvider } from "@/hooks/use-lang";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import Landing from "@/pages/Landing";
import BusinessPlan from "@/pages/BusinessPlan";
import Products from "@/pages/Products";
import Invest from "@/pages/Invest";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import StoreLevels from "@/pages/StoreLevels";
import News from "@/pages/News";
import Team from "@/pages/Team";
import Orders from "@/pages/Orders";
import TopupBalance from "@/pages/TopupBalance";
import Admin from "@/pages/Admin";
import Withdraw from "@/pages/Withdraw";
import Withdraw from "@/pages/Withdraw";



const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LangProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/business-plan" element={<BusinessPlan />} />
            <Route path="/products" element={<Products />} />
            <Route path="/invest" element={<Invest />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/store-levels" element={<StoreLevels />} />
            <Route path="/login" element={<Login />} />
            <Route path="/news" element={<News />} />
            <Route path="/team" element={<Team />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/topup" element={<TopupBalance />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
            <Route path="/withdraw" element={<Withdraw />} />

          </Routes>
          <BottomNav />
        </BrowserRouter>
      </TooltipProvider>
    </LangProvider>
  </QueryClientProvider>
);

export default App;
