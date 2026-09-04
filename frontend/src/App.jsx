import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/AppShell";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ArgumentAnalysis from "./pages/ArgumentAnalysis";
import FallacyDetection from "./pages/FallacyDetection";
import CounterargumentGeneration from "./pages/CounterargumentGeneration";
import CaseReview from "./pages/CaseReview";
import DebateSessions from "./pages/DebateSessions";
import DebateRoom from "./pages/DebateRoom";
import PresentationAnalysis from "./pages/PresentationAnalysis";
import PerformanceScore from "./pages/PerformanceScore";
import Goals from "./pages/Goals";
import PeerComparison from "./pages/PeerComparison";
import CoachingPlan from "./pages/CoachingPlan";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import EditProfile from "./pages/EditProfile";
import DebatePrepResearch from "./pages/DebatePrepResearch";
import AgenticCoaching from "./pages/AgenticCoaching";
import Topics from "./pages/Topics";
import CoachDashboard from "./pages/CoachDashboard";
import LearnerDetail from "./pages/LearnerDetail";
import Classes from "./pages/Classes";
import ClassDetail from "./pages/ClassDetail";
import AdminDashboard from "./pages/AdminDashboard";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <NotificationProvider>
            <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes - any authenticated role.
                ProtectedRoute's `roles` check happens before AppShell
                ever renders */}
            <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/analyze" element={<ArgumentAnalysis />} />
              <Route path="/fallacies" element={<FallacyDetection />} />
              <Route path="/counterarguments" element={<CounterargumentGeneration />} />
              <Route path="/case-review" element={<CaseReview />} />
              <Route path="/debates" element={<DebateSessions />} />
              <Route path="/debates/:id" element={<DebateRoom />} />
              <Route path="/presentation" element={<PresentationAnalysis />} />
              <Route path="/research" element={<DebatePrepResearch />} />
              <Route path="/coaching-agent" element={<AgenticCoaching />} />
              <Route path="/topics" element={<Topics />} />
              <Route path="/performance" element={<PerformanceScore />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/comparison" element={<PeerComparison />} />
              <Route path="/coaching" element={<CoachingPlan />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/profile" element={<EditProfile />} />
            </Route>

            <Route
              element={
                <ProtectedRoute roles={["debate_coach", "educator", "admin"]}>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/coach-dashboard" element={<CoachDashboard />} />
              <Route path="/coach-dashboard/learner/:id" element={<LearnerDetail />} />
              <Route path="/classes" element={<Classes />} />
              <Route path="/classes/:id" element={<ClassDetail />} />
            </Route>

            <Route
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </ErrorBoundary>
      </BrowserRouter>
    </ThemeProvider>
  );
}
