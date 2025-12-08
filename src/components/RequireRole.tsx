import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function RequireRole({ role, children }: { role: "admin" | "team_leader" | "dsr"; children: ReactNode }) {
  const { user, isLoading, role: currentRole } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (role === "admin") {
    const isAdmin = currentRole === "admin" || currentRole === "regional_manager";
    return isAdmin ? <>{children}</> : <Navigate to="/" replace />;
  }
  return currentRole === role ? <>{children}</> : <Navigate to="/" replace />;
}

export default RequireRole;
