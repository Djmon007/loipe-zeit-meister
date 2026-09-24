import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

// Worker Pages
import Auth from "./pages/Auth";
import Zeiterfassung from "./pages/Zeiterfassung";
import Loipen from "./pages/Loipen";
import Diesel from "./pages/Diesel";
import Spesen from "./pages/Spesen";
import KasseTageskarten from "./pages/KasseTageskarten";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminZeiterfassung from "./pages/admin/AdminZeiterfassung";
import AdminLoipen from "./pages/admin/AdminLoipen";
import AdminDiesel from "./pages/admin/AdminDiesel";
import AdminSpesen from "./pages/admin/AdminSpesen";
import AdminMitarbeiter from "./pages/admin/AdminMitarbeiter";
import AdminKasse from "./pages/admin/AdminKasse";
import AdminAufgaben from "./pages/admin/AdminAufgaben";
import AdminLoipenConfig from "./pages/admin/AdminLoipenConfig";
import AdminSaisons from "./pages/admin/AdminSaisons";

const queryClient = new QueryClient();

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Laden...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

// Admin route wrapper
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Laden...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/zeiterfassung" replace />;
  }

  return <>{children}</>;
}

// Auth route - redirect if already logged in
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Laden...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/zeiterfassung" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Redirect root to zeiterfassung or auth */}
      <Route path="/" element={<Navigate to="/zeiterfassung" replace />} />
      
      {/* Auth */}
      <Route
        path="/auth"
        element={
          <AuthRoute>
            <Auth />
          </AuthRoute>
        }
      />

      {/* Worker app routes */}
      <Route
        path="/zeiterfassung"
        element={
          <ProtectedRoute>
            <Zeiterfassung />
          </ProtectedRoute>
        }
      />
      <Route
        path="/loipen"
        element={
          <ProtectedRoute>
            <Loipen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/diesel"
        element={
          <ProtectedRoute>
            <Diesel />
          </ProtectedRoute>
        }
      />
      <Route
        path="/spesen"
        element={
          <ProtectedRoute>
            <Spesen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/kasse"
        element={
          <ProtectedRoute>
            <KasseTageskarten />
          </ProtectedRoute>
        }
      />

      {/* Admin Panel routes */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/zeiterfassung"
        element={
          <AdminRoute>
            <AdminZeiterfassung />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/loipen"
        element={
          <AdminRoute>
            <AdminLoipen />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/diesel"
        element={
          <AdminRoute>
            <AdminDiesel />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/spesen"
        element={
          <AdminRoute>
            <AdminSpesen />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/mitarbeiter"
        element={
          <AdminRoute>
            <AdminMitarbeiter />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/kasse"
        element={
          <AdminRoute>
            <AdminKasse />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/aufgaben"
        element={
          <AdminRoute>
            <AdminAufgaben />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/loipen-config"
        element={
          <AdminRoute>
            <AdminLoipenConfig />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/saisons"
        element={
          <AdminRoute>
            <AdminSaisons />
          </AdminRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
