import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Search, LogIn, Menu, X, Settings, LogOut } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import LanguageSwitcher from "./LanguageSwitcher";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, isAdmin, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const publicNavItems = [
    { path: "/", label: t("nav.search"), icon: Search },
    { path: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/");
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center">
            <Logo size="sm" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {publicNavItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={location.pathname === item.path ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
            
            <LanguageSwitcher />

            {user ? (
              <>
                {isAdmin && (
                  <>
                    <Link to="/admin">
                      <Button
                        variant={location.pathname.startsWith("/admin") ? "default" : "outline"}
                        size="sm"
                        className="gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Admin
                      </Button>
                    </Link>
                    <Link to="/admin/commission">
                      <Button
                        variant={location.pathname === "/admin/commission" ? "default" : "outline"}
                        size="sm"
                        className="gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Admin Commission
                      </Button>
                    </Link>
                  </>
                )}
                <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
                  <LogOut className="w-4 h-4" />
                  {t("nav.logout")}
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button variant="outline" size="sm" className="gap-2 ml-2">
                  <LogIn className="w-4 h-4" />
                  {t("nav.adminLogin")}
                </Button>
              </Link>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <LanguageSwitcher />
            <button
              className="p-2 text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div
          className={cn(
            "md:hidden overflow-hidden transition-all duration-300",
            mobileMenuOpen ? "max-h-80 pb-4" : "max-h-0"
          )}
        >
          <nav className="flex flex-col gap-2">
            {publicNavItems.map((item) => (
              <Link 
                key={item.path} 
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button
                  variant={location.pathname === item.path ? "default" : "ghost"}
                  className="w-full justify-start gap-2"
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
            
            {user ? (
              <>
                {isAdmin && (
                  <>
                    <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                      <Button
                        variant={location.pathname.startsWith("/admin") ? "default" : "outline"}
                        className="w-full justify-start gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Admin
                      </Button>
                    </Link>
                    <Link to="/admin/commission" onClick={() => setMobileMenuOpen(false)}>
                      <Button
                        variant={location.pathname === "/admin/commission" ? "default" : "outline"}
                        className="w-full justify-start gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Admin Commission
                      </Button>
                    </Link>
                  </>
                )}
                <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                  {t("nav.logout")}
                </Button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <LogIn className="w-4 h-4" />
                  {t("nav.adminLogin")}
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
