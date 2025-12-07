import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <Logo size="lg" className="mx-auto mb-8" />
        
        <div className="mb-8">
          <h1 className="text-8xl font-bold text-primary mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Ukurasa Haupatikani</h2>
          <p className="text-muted-foreground">
            Samahani, ukurasa unaoutafuta haupo. Labda umefutwa au URL si sahihi.
          </p>
        </div>

        <div className="glass rounded-2xl p-6 border border-border/50 mb-8">
          <p className="text-sm text-muted-foreground mb-4">
            Ulikuwa unajaribu kufikia:
          </p>
          <code className="block bg-secondary/50 rounded-lg px-4 py-2 text-sm font-mono text-foreground break-all">
            {location.pathname}
          </code>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default" className="gap-2">
            <Link to="/">
              <Home className="h-4 w-4" />
              Rudi Nyumbani
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4" />
              Rudi Nyuma
            </Link>
          </Button>
        </div>

        <div className="mt-8 pt-8 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            TSM Territory Manager • DStv Tanzania
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
