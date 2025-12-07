import { useState, useEffect } from "react";
import { Navigate, Routes, Route, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Logo from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LayoutDashboard, Package, Users, UserPlus, LogOut, AlertTriangle, Home, Menu, X, ShieldCheck, FileBarChart } from "lucide-react";
import AdminOverview from "./AdminOverview";
import AdminInventory from "./AdminInventory";
import AdminTeams from "./AdminTeams";
import AdminTeamDetails from "./AdminTeamDetails";
import AdminUsers from "./AdminUsers";
import AdminUnpaid from "./AdminUnpaid";
import AdminVerification, { getPendingUpdates } from "./AdminVerification";
import AdminReport from "./AdminReport";

const AdminDashboard = () => {
  const { user, isAdmin, isLoading, signOut } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Check for pending verification updates
  useEffect(() => {
    const checkPending = () => {
      const pending = getPendingUpdates().filter(u => u.status === "pending");
      setPendingCount(pending.length);
    };
    checkPending();
    // Check every 5 seconds for updates
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, [location]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><p>{t("common.loading")}</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const navItems = [
    { path: "/admin", label: t("admin.overview"), icon: LayoutDashboard, badge: 0 },
    { path: "/admin/inventory", label: t("admin.inventory"), icon: Package, badge: 0 },
    { path: "/admin/verification", label: "Verification", icon: ShieldCheck, badge: pendingCount },
    { path: "/admin/teams", label: t("admin.teams"), icon: Users, badge: 0 },
    { path: "/admin/users", label: "Members (TL/DSR)", icon: UserPlus, badge: 0 },
    { path: "/admin/report", label: "TL Report", icon: FileBarChart, badge: 0 },
    { path: "/admin/unpaid", label: t("admin.unpaidRecovery"), icon: AlertTriangle, badge: 0 },
  ];

  const NavContent = ({ onItemClick }: { onItemClick?: () => void }) => (
    <>
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <Link key={item.path} to={item.path} onClick={onItemClick}>
            <Button variant={location.pathname === item.path ? "default" : "ghost"} className="w-full justify-start gap-2" size="sm">
              <item.icon className="w-4 h-4" />
              {item.label}
              {item.badge > 0 && (
                <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1 text-xs">
                  {item.badge}
                </Badge>
              )}
            </Button>
          </Link>
        ))}
      </nav>
      <div className="space-y-2 pt-4 border-t border-border/50">
        <Link to="/" onClick={onItemClick}><Button variant="ghost" className="w-full justify-start gap-2" size="sm"><Home className="w-4 h-4" />Nyumbani</Button></Link>
        <LanguageSwitcher />
        <Button variant="ghost" className="w-full justify-start gap-2" size="sm" onClick={signOut}><LogOut className="w-4 h-4" />{t("nav.logout")}</Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-background/95 backdrop-blur-md border-b border-border p-4 flex items-center justify-between sticky top-0 z-50">
        <Logo size="sm" />
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10 border-primary/50">
              <Menu className="h-6 w-6 text-foreground" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-background border-r border-border p-4 flex flex-col">
            <div className="mb-6 pb-4 border-b border-border">
              <Logo size="sm" />
            </div>
            <NavContent onItemClick={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop Sidebar */}
      <aside className="w-64 glass border-r border-border/50 p-4 hidden md:flex flex-col shrink-0">
        <div className="mb-8"><Logo size="sm" /></div>
        <NavContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <Routes>
          <Route path="/" element={<AdminOverview />} />
          <Route path="/inventory" element={<AdminInventory />} />
          <Route path="/verification" element={<AdminVerification />} />
          <Route path="/teams" element={<AdminTeams />} />
          <Route path="/teams/:teamId" element={<AdminTeamDetails />} />
          <Route path="/users" element={<AdminUsers />} />
          <Route path="/report" element={<AdminReport />} />
          <Route path="/unpaid" element={<AdminUnpaid />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminDashboard;
