import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Wrap any route that requires login. Optionally pass `roles` (array of
 * role strings) to also gate by role, e.g.:
 *   <ProtectedRoute roles={["educator", "admin"]}><ClassAnalytics /></ProtectedRoute>
 */
export default function ProtectedRoute({ children, roles }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface text-faint font-mono text-sm">
        Loading...
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (roles && profile && !roles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
