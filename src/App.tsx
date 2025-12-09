import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCommissionPage from "./pages/admin/AdminCommission";
import DSRDashboard from "./pages/dsr/DSRDashboard";
import DSRStock from "./pages/dsr/DSRStock";
import DSRMySales from "./pages/dsr/DSRMySales";
import DSRCommission from "./pages/dsr/DSRCommission";
import RequireRole from "@/components/RequireRole";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin/*" element={<AdminDashboard />} />
              <Route path="/admin/commission" element={<AdminCommissionPage />} />
              {/* DSR protected routes */}
              <Route path="/dsr/dashboard" element={<RequireRole role="dsr"><DSRDashboard onNavigate={() => {}} /></RequireRole>} />
              <Route path="/dsr/stock" element={<RequireRole role="dsr"><DSRStock onNavigate={() => {}} /></RequireRole>} />
              <Route path="/dsr/my-sales" element={<RequireRole role="dsr"><DSRMySales onNavigate={() => {}} /></RequireRole>} />
              <Route path="/dsr/commission" element={<RequireRole role="dsr"><DSRCommission /></RequireRole>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
