import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
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
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Maintenance from "@/pages/Maintenance";

const queryClient = new QueryClient();

const Protected = ({ children }: { children: React.ReactNode }) => {
  const [checked, setChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session);
      setChecked(true);
    });
  }, []);
  if (!checked) return null;
  return loggedIn ? <>{children}</> : <Navigate to="/login" replace />;
};

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
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/dashboard" element={<Protected><Maintenance /></Protected>} />
            <Route path="/store-levels" element={<Protected><StoreLevels /></Protected>} />
            <Route path="/business-plan" element={<Protected><BusinessPlan /></Protected>} />
            <Route path="/products" element={<Protected><Products /></Protected>} />
            <Route path="/invest" element={<Protected><Invest /></Protected>} />
            <Route path="/news" element={<Protected><News /></Protected>} />
            <Route path="/team" element={<Protected><Team /></Protected>} />
            <Route path="/orders" element={<Protected><Orders /></Protected>} />
            <Route path="/topup" element={<Protected><TopupBalance /></Protected>} />
            <Route path="/withdraw" element={<Protected><Withdraw /></Protected>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </BrowserRouter>
      </TooltipProvider>
    </LangProvider>
  </QueryClientProvider>
);

export default App;