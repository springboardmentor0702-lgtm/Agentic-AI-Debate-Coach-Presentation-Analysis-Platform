import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import LearnerDashboard from './pages/LearnerDashboard';
import CoachDashboard from './pages/CoachDashboard';
import EducatorDashboard from './pages/EducatorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import LiveDebateStudio from './pages/LiveDebateStudio';
import PresentationStudio from './pages/PresentationStudio';
import ArgumentLab from './pages/ArgumentLab';
import LearningPathways from './pages/LearningPathways';
import ReportsCenter from './pages/ReportsCenter';
import { Sparkles, Shield, Cpu, ExternalLink } from 'lucide-react';

function MainApp() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center animate-pulse">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div className="text-sm font-semibold tracking-wider uppercase text-slate-500">
          Initializing Debate AI...
        </div>
      </div>
    );
  }

  // Not logged in: Show Login or Register
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
        <div className="p-4 flex items-center justify-between border-b border-slate-900 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black">
              D
            </div>
            <span className="font-extrabold text-lg tracking-tight text-white">
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-300 bg-clip-text text-transparent">Debate AI</span>
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono">Platform v1.0.0</span>
        </div>

        {authMode === 'login' ? (
          <Login onSwitchToRegister={() => setAuthMode('register')} />
        ) : (
          <Register onSwitchToLogin={() => setAuthMode('login')} />
        )}

        <footer className="py-4 text-center text-xs text-slate-600 border-t border-slate-900">
          Agentic AI Debate Coach & Presentation Analysis Platform • Powered by Google DeepMind Research
        </footer>
      </div>
    );
  }

  // Render role-specific dashboard if activeTab is "dashboard"
  const renderDashboardByRole = () => {
    switch (user.role) {
      case 'Debate Coach':
        return <CoachDashboard onNavigate={setActiveTab} />;
      case 'Educator':
        return <EducatorDashboard onNavigate={setActiveTab} />;
      case 'Administrator':
        return <AdminDashboard onNavigate={setActiveTab} />;
      case 'Learner':
      default:
        return <LearnerDashboard onNavigate={setActiveTab} />;
    }
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardByRole();
      case 'studio':
        return <LiveDebateStudio />;
      case 'presentation':
        return <PresentationStudio />;
      case 'argument-lab':
        return <ArgumentLab />;
      case 'pathways':
        return <LearningPathways onNavigate={setActiveTab} />;
      case 'reports':
        return <ReportsCenter />;
      default:
        return renderDashboardByRole();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <div>
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          {renderActiveTab()}
        </main>
      </div>

      <footer className="mt-12 py-6 border-t border-slate-900 bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>AI Reasoning Cluster: Operational</span>
            <span>•</span>
            <span>Active Role: <strong className="text-slate-300">{user.role}</strong></span>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setActiveTab('reports')} className="hover:text-slate-300 transition">
              PDF Exports
            </button>
            <span>•</span>
            <button onClick={() => setActiveTab('argument-lab')} className="hover:text-slate-300 transition">
              Fallacy Catalog
            </button>
            <span>•</span>
            <span className="font-mono text-slate-600">v1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
