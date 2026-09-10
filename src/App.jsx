import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DashboardLayout } from './layouts/DashboardLayout';
// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
// Learner Pages
import { DashboardPage } from './pages/learner/DashboardPage';
import { ArgumentAnalysisPage } from './pages/learner/ArgumentAnalysisPage';
import { FallacyDetectionPage } from './pages/learner/FallacyDetectionPage';
import { CounterargumentsPage } from './pages/learner/CounterargumentsPage';
import { CaseReviewPage } from './pages/learner/CaseReviewPage';
import { DebatePage } from './pages/learner/DebatePage';
import { PresentationAnalysisPage } from './pages/learner/PresentationAnalysisPage';
import { AskCoachPage } from './pages/learner/AskCoachPage';
import { ResearchPage } from './pages/learner/ResearchPage';
import { PerformancePage } from './pages/learner/PerformancePage';
import { NotificationsPage } from './pages/learner/NotificationsPage';
import { ProfilePage } from './pages/learner/ProfilePage';
// Role Workspaces
import { CoachDashboardPage } from './pages/coach/CoachDashboardPage';
import { EducatorDashboardPage } from './pages/educator/EducatorDashboardPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();
    if (isLoading) {
        return (<div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-400 font-bold text-sm">
        Initializing MindArena Cognitive Systems...
      </div>);
    }
    if (!isAuthenticated) {
        return <Navigate to="/login" replace/>;
    }
    return <>{children}</>;
};
export default function App() {
    return (<ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />}/>
            <Route path="/register" element={<RegisterPage />}/>

            {/* Protected Workspace Routes */}
            <Route path="/" element={<ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace/>}/>
              <Route path="dashboard" element={<DashboardPage />}/>

              {/* AI Architecture #1: Fixed Pipeline Suite */}
              <Route path="argument-analysis" element={<ArgumentAnalysisPage />}/>
              <Route path="fallacy-detection" element={<FallacyDetectionPage />}/>
              <Route path="counterarguments" element={<CounterargumentsPage />}/>
              <Route path="case-review" element={<CaseReviewPage />}/>

              {/* AI Architecture #2: Multi-Agent Debate Arena */}
              <Route path="debate" element={<DebatePage />}/>

              {/* Speech & Voice Analysis */}
              <Route path="presentation-analysis" element={<PresentationAnalysisPage />}/>

              {/* AI Architecture #4: Tool-Calling Coaching Agent */}
              <Route path="ask-coach" element={<AskCoachPage />}/>

              {/* AI Architecture #3: Self-Directed ReAct Research Agent */}
              <Route path="research" element={<ResearchPage />}/>

              {/* Core Analytics & Management */}
              <Route path="performance" element={<PerformancePage />}/>
              <Route path="notifications" element={<NotificationsPage />}/>
              <Route path="profile" element={<ProfilePage />}/>

              {/* Coach Persona Views */}
              <Route path="coach/dashboard" element={<CoachDashboardPage />}/>
              <Route path="coach/learners" element={<CoachDashboardPage />}/>
              <Route path="coach/feedback" element={<CoachDashboardPage />}/>

              {/* Educator Persona Views */}
              <Route path="educator/dashboard" element={<EducatorDashboardPage />}/>
              <Route path="educator/classes" element={<EducatorDashboardPage />}/>
              <Route path="educator/analytics" element={<EducatorDashboardPage />}/>

              {/* Admin Persona Views */}
              <Route path="admin/dashboard" element={<AdminDashboardPage />}/>
              <Route path="admin/users" element={<AdminDashboardPage />}/>
              <Route path="admin/analytics" element={<AdminDashboardPage />}/>
              <Route path="admin/export" element={<AdminDashboardPage />}/>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>);
}
