import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import OAuthCallback from "./pages/OAuthCallback";
import Dashboard from "./pages/Dashboard";
import Practice from "./pages/Practice";
import Analyze from "./pages/Analyze";
import History from "./pages/History";
import Progress from "./pages/Progress";
import Settings from "./pages/Settings";
import Report from "./pages/Report";
import CoachDashboard from "./pages/CoachDashboard";
import EducatorDashboard from "./pages/EducatorDashboard";
import AdminDashboard from "./pages/AdminDashboard";

const Shell = ({ children }) => (
  <div className="shell">
    <Sidebar />
    <div className="main">
      <Topbar />
      {children}
    </div>
  </div>
);

const Private = ({ roles, children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return <Shell>{children}</Shell>;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />
      <Route path="/" element={<Private><Dashboard /></Private>} />
      <Route path="/practice" element={<Private><Practice /></Private>} />
      <Route path="/session/:id" element={<Private><Practice /></Private>} />
      <Route path="/analyze" element={<Private><Analyze /></Private>} />
      <Route path="/history" element={<Private><History /></Private>} />
      <Route path="/progress" element={<Private><Progress /></Private>} />
      <Route path="/settings" element={<Private><Settings /></Private>} />
      <Route path="/report/:id" element={<Private><Report /></Private>} />
      <Route path="/coach" element={<Private roles={["coach", "educator", "admin"]}><CoachDashboard /></Private>} />
      <Route path="/educator" element={<Private roles={["educator", "admin"]}><EducatorDashboard /></Private>} />
      <Route path="/admin" element={<Private roles={["admin"]}><AdminDashboard /></Private>} />
    </Routes>
  );
}
