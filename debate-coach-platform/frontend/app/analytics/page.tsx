'use client';

import { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

interface PerformanceReport {
  user_id: number;
  user_name: string;
  user_email: string;
  report_generated_at: string;
  debate_stats: {
    total_debates: number;
    completed_debates: number;
    active_debates: number;
    average_duration_minutes: number;
    most_common_topic: string | null;
    win_rate: number;
  };
  presentation_stats: {
    total_presentations: number;
    analyzed_presentations: number;
    average_clarity_score: number | null;
    average_confidence_score: number | null;
    average_engagement_score: number | null;
  };
  recent_skill_progress: { timestamp: string; skill_name: string; score: number }[];
  progress_history: { timestamp: string; label: string; presentation_score: number; overall_score: number }[];
  recommended_focus_areas: string[];
  overall_progress_percentage: number;
}

interface ActivityLog {
  timestamp: string;
  activity_type: string;
  description: string;
  details: string | null;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      // Fetch performance report
      const reportResponse = await fetch(`${BACKEND_URL}/analytics/me/performance-report`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (reportResponse.status === 401) {
        router.push('/login');
        return;
      }

      if (!reportResponse.ok) {
        throw new Error('Failed to fetch performance report');
      }

      const reportData = await reportResponse.json();
      setReport(reportData);

      // Fetch activity log
      const activityResponse = await fetch(`${BACKEND_URL}/analytics/dashboard/activity-log`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setActivityLog(activityData);
      }

      setError(null);
    } catch (err) {
      setError('Failed to load performance report');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const loadReports = window.setTimeout(() => { void fetchReports(); }, 0);
    return () => window.clearTimeout(loadReports);
  }, [fetchReports]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-600">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <p className="text-slate-600">{error || 'No report data available'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">Analytics & Performance</h1>
          <p className="text-slate-600 mt-2">Track your learning progress and performance</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Overall Progress */}
        <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Overall Progress</h2>
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <div className="relative w-24 h-24 mx-auto">
                <svg className="transform -rotate-90 w-24 h-24">
                  <circle
                    cx="48"
                    cy="48"
                    r="44"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="8"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="44"
                    fill="none"
                    stroke="#14b8a6"
                    strokeWidth="8"
                    strokeDasharray={`${(report.overall_progress_percentage / 100) * 276.4} 276.4`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-teal-600">
                    {Math.round(report.overall_progress_percentage)}%
                  </span>
                </div>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Focus Areas</h3>
              {report.recommended_focus_areas.length > 0 ? (
                <ul className="space-y-2">
                  {report.recommended_focus_areas.map((area, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-slate-700">
                      <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                      {area}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-600">Great job! No areas need immediate focus.</p>
              )}
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Debate Statistics */}
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Debate Statistics</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Total Debates</span>
                <span className="text-2xl font-bold text-teal-600">{report.debate_stats.total_debates}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Completed</span>
                <span className="text-2xl font-bold text-green-600">{report.debate_stats.completed_debates}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Active</span>
                <span className="text-2xl font-bold text-blue-600">{report.debate_stats.active_debates}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Win Rate</span>
                <span className="text-2xl font-bold text-purple-600">{(report.debate_stats.win_rate * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* Presentation Statistics */}
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Presentation Statistics</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Total Presentations</span>
                <span className="text-2xl font-bold text-teal-600">{report.presentation_stats.total_presentations}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Analyzed</span>
                <span className="text-2xl font-bold text-green-600">{report.presentation_stats.analyzed_presentations}</span>
              </div>
              {report.presentation_stats.average_clarity_score !== null && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Avg Clarity</span>
                  <span className="text-2xl font-bold text-blue-600">{report.presentation_stats.average_clarity_score.toFixed(0)}/100</span>
                </div>
              )}
              {report.presentation_stats.average_confidence_score !== null && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Avg Confidence</span>
                  <span className="text-2xl font-bold text-purple-600">{report.presentation_stats.average_confidence_score.toFixed(0)}/100</span>
                </div>
              )}
              {report.presentation_stats.average_engagement_score !== null && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Avg Engagement</span>
                  <span className="text-2xl font-bold text-amber-600">{report.presentation_stats.average_engagement_score.toFixed(0)}/100</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow-md">
          <h3 className="text-xl font-bold text-slate-900">Progress Over Time</h3>
          {report.progress_history.length > 0 ? (
            <div className="mt-6 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={report.progress_history} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <XAxis dataKey="timestamp" tickFormatter={(value: string) => new Date(value).toLocaleDateString()} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip labelFormatter={(value) => new Date(String(value)).toLocaleDateString()} />
                  <Line type="monotone" dataKey="presentation_score" name="Presentation score" stroke="#0f766e" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-4 text-slate-600">Analyze a presentation to start building your progress graph.</p>
          )}
        </div>

        {/* Activity Log */}
        {activityLog.length > 0 && (
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {activityLog.map((activity, idx) => (
                <div key={idx} className="pb-3 border-b border-slate-200 last:border-b-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-slate-900">{activity.description}</p>
                      {activity.details && (
                        <p className="text-sm text-slate-600 mt-1">{activity.details}</p>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/dashboard"
            className="px-6 py-2 bg-slate-500 text-white font-semibold rounded-lg hover:bg-slate-600 transition"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
