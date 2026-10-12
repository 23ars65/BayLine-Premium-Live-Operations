
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { CustomerDashboard } from "./pages/CustomerDashboard";
import { NewBooking } from "./pages/NewBooking";
import { AdminBoard } from "./pages/AdminBoard";
import { LiveOperations } from "./pages/LiveOperations";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { session, loading } = useAuth();

  if (loading) return <CenteredNote text="Loading BayLine…" />;
  if (!session) return <Navigate to="/login" replace />;

  return children;
}

function RequireStaff({ children }: { children: JSX.Element }) {
  const { profile, loading } = useAuth();

  if (loading) return <CenteredNote text="Loading BayLine…" />;
  if (!profile || (profile.role !== "staff" && profile.role !== "admin")) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function CenteredNote({ text }: { text: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-bone/40">
        <span className="status-live h-2 w-2 rounded-full bg-amber-500" />
        {text}
      </div>
    </div>
  );
}

function AppRedirect() {
  const { profile, loading } = useAuth();

  if (loading) return <CenteredNote text="Loading BayLine…" />;
  if (!profile) return <Navigate to="/login" replace />;

  return (
    <Navigate
      to={
        profile.role === "staff" || profile.role === "admin"
          ? "/board"
          : "/dashboard"
      }
      replace
    />
  );
}

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/privacy-policy"
          element={<PrivacyPolicy />}
        />

        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppRedirect />
            </RequireAuth>
          }
        />

        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <CustomerDashboard />
            </RequireAuth>
          }
        />

        <Route
          path="/book"
          element={
            <RequireAuth>
              <NewBooking />
            </RequireAuth>
          }
        />

        <Route
          path="/board"
          element={
            <RequireAuth>
              <RequireStaff>
                <AdminBoard />
              </RequireStaff>
            </RequireAuth>
          }
        />

        <Route
          path="/operations"
          element={
            <RequireAuth>
              <RequireStaff>
                <LiveOperations />
              </RequireStaff>
            </RequireAuth>
          }
        />

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>

      <Footer />
    </div>
  );
}
